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
export function updatePerformanceAvailabilities(params: {
    startFrom: Date;
    startThrough: Date;
    ttl: number;
}): IUpdatePerformanceAvailabilitiesOperation<void> {
    return async (
        stockRepo: StockRepo,
        performanceRepo: PerformanceRepo,
        performanceAvailabilityRepo: PerformanceAvailabilityRepo
    ) => {
        debug('finding performances...');
        const ids = <string[]>await performanceRepo.performanceModel.distinct(
            '_id',
            {
                start_date: {
                    $gte: params.startFrom,
                    $lt: params.startThrough
                }
            }
        ).exec();
        debug(ids.length, 'performances found.');

        // パフォーマンスごとに在庫数を集計
        debug('aggregating...');
        const results = <{ _id: string; count: number }[]>await stockRepo.stockModel.aggregate(
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

        const availabilities: factory.performance.IAvailability[] = ids.map((id) => {
            // InStockの在庫がない場合は、resultsにデータとして含まれない
            const result = results.find((r) => r._id === id);

            return { id: id, remainingAttendeeCapacity: (result !== undefined) ? result.count : 0 };
        });

        debug(`storing ${availabilities.length} performanceAvailabilities...`);
        await performanceAvailabilityRepo.store(availabilities, params.ttl);
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
            [key: string]: number;
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

                // 基本は、在庫なしであれば0、あれば必要座席数から算出
                let availableNum: number = 0;
                // 必要座席数が正の値で、残席数があれば、在庫を算出
                if (requiredNum > 0 && availableStockNum !== undefined) {
                    availableNum = Math.floor(availableStockNum / requiredNum);
                }

                // 流入制限ありの場合は、そちらを考慮して在庫数を上書き
                if (ticketType.rate_limit_unit_in_seconds > 0) {
                    const rateLimitKey = {
                        performanceStartDate: performanceStartDate,
                        ticketTypeCategory: ticketType.ttts_extension.category,
                        unitInSeconds: ticketType.rate_limit_unit_in_seconds
                    };
                    const rateLimitHolder = await ticketTypeCategoryRateLimitRepo.getHolder(rateLimitKey);
                    debug('rate limtit holder exists?', rateLimitHolder);

                    // 流入制限保持者がいなければ在庫数は固定で1、いれば0
                    availableNum = (rateLimitHolder === null) ? 1 : 0;
                }

                // 券種ごとの在庫数をDBに保管
                await seatReservationOfferAvailabilityRepo.save(
                    performance.id, ticketType.id, availableNum
                );
            }));
        }));
    };
}
