/**
 * 在庫状況サービス
 * @namespace service.itemAvailability
 */

import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '@motionpicture/ttts-factory';

import { RedisRepository as PerformanceAvailabilityRepo } from '../repo/itemAvailability/performance';
import { RedisRepository as SeatReservationOfferAvailabilityRepo } from '../repo/itemAvailability/seatReservationOffer';
import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as StockRepo } from '../repo/stock';

const debug = createDebug('ttts-domain:service:itemAvailability');

export type IUpdatePerformanceAvailabilitiesOperation<T> = (
    stockRepo: StockRepo,
    performanceRepo: PerformanceRepo,
    performanceAvailabilityRepo: PerformanceAvailabilityRepo
) => Promise<T>;

/**
 * 空席ステータスを更新する
 * @memberof service.itemAvailability
 */
export function updatePerformanceAvailabilities(ttl: number): IUpdatePerformanceAvailabilitiesOperation<void> {
    return async (
        stockRepo: StockRepo,
        performanceRepo: PerformanceRepo,
        performanceAvailabilityRepo: PerformanceAvailabilityRepo
    ) => {
        debug('finding performances...');
        const ids = await performanceRepo.performanceModel.distinct(
            '_id',
            {
                start_date: {
                    // tslint:disable-next-line:no-magic-numbers
                    $gt: moment().toDate(),
                    // tslint:disable-next-line:no-magic-numbers
                    $lt: moment().add(3, 'months').toDate()
                }
            }
        ).exec();
        debug('performances found.', ids);

        // パフォーマンスごとに在庫数を集計
        debug('aggregating...');
        const results: any[] = await stockRepo.stockModel.aggregate(
            [
                {
                    $match: {
                        availability: factory.itemAvailability.InStock,
                        performance: { $in: ids }
                    }
                },
                {
                    $group: {
                        _id: '$performance',
                        count: { $sum: 1 }
                    }
                }
            ]
        ).exec();

        const availabilities: factory.performance.IAvailability[] = results.map((result) => {
            return { id: result._id.toString(), remainingAttendeeCapacity: result.count };
        });

        debug('storing performanceAvailabilities...');
        await performanceAvailabilityRepo.store(availabilities, ttl);
        debug('performanceAvailabilities stored.');
    };
}

/**
 * パフォーマンスの券種ごとに在庫状況を更新する
 */
export function updatePerformanceOffersAvailability() {
    return async (
        stockRepo: StockRepo,
        performanceRepo: PerformanceRepo,
        seatReservationOfferAvailabilityRepo: SeatReservationOfferAvailabilityRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo
    ) => {
        // 本日以降
        debug('finding performances...');
        const performances = await performanceRepo.performanceModel.find(
            {
                start_date: {
                    // tslint:disable-next-line:no-magic-numbers
                    $gt: moment().toDate(),
                    // tslint:disable-next-line:no-magic-numbers
                    $lt: moment().add(3, 'months').toDate()
                }
            }
        )
            .populate('film screen theater')
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .exec()
            .then((docs) => docs.map((doc) => <factory.performance.IPerformanceWithDetails>doc.toObject()));
        debug('performances found.', performances.length);

        // パフォーマンスごとに在庫数を集計
        debug('aggregating...');
        const results: {
            _id: string;
            count: number;
        }[] = await stockRepo.stockModel.aggregate(
            [
                {
                    $match: {
                        availability: factory.itemAvailability.InStock,
                        performance: { $in: performances.map((p) => p.id) }
                    }
                },
                {
                    $group: {
                        _id: '$performance',
                        count: { $sum: 1 }
                    }
                }
            ]
        ).exec();
        debug('stock aggregated.', results.length);

        // パフォーマンスIDごとに
        const availableStockNums: {
            [key: string]: number
        } = {};
        results.forEach((result) => {
            // tslint:disable-next-line:no-magic-numbers
            availableStockNums[result._id] = result.count;
        });

        // パフォーマンスごとにその券種のavailabilityを作成する
        await Promise.all(performances.map(async (performance) => {
            // 券種ごとにavailabilityを作成する
            const ticketTypes = performance.ticket_type_group.ticket_types;
            const performanceStartDate = moment(performance.start_date).toDate();

            await Promise.all(ticketTypes.map(async (ticketType) => {
                const availableStockNum = availableStockNums[performance.id];
                const requiredNum = ticketType.ttts_extension.required_seat_num;

                let availableNum: number;

                // 流入制限ありの場合は、そちらも考慮
                if (ticketType.rate_limit_unit_in_seconds > 0) {
                    const rateLimitKey = {
                        performanceStartDate: performanceStartDate,
                        ticketTypeCategory: ticketType.ttts_extension.category,
                        unitInSeconds: ticketType.rate_limit_unit_in_seconds
                    };
                    const rateLimitHolder = await ticketTypeCategoryRateLimitRepo.getHolder(rateLimitKey);
                    debug('rate limtit holder exists?', rateLimitHolder);

                    availableNum = (rateLimitHolder === null) ? 1 : 0;
                } else {
                    // レート制限保持者がいる、あるいは、在庫なしであれば、0
                    availableNum = (availableStockNum !== undefined) ? Math.floor(availableStockNum / requiredNum) : 0;
                }

                // 券種ごとの在庫数をDBに保管
                await seatReservationOfferAvailabilityRepo.save(
                    performance.id, ticketType.id, availableNum
                );
            }));
        }));
    };
}
