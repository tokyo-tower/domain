/**
 * 在庫状況サービス
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '@motionpicture/ttts-factory';

import { RedisRepository as PerformanceAvailabilityRepo } from '../repo/itemAvailability/performance';
import { RedisRepository as SeatReservationOfferAvailabilityRepo } from '../repo/itemAvailability/seatReservationOffer';
import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { RedisRepository as StockRepo } from '../repo/stock';

const debug = createDebug('ttts-domain:service');

const MAXIMUM_ATTENDEE_CAPACITY = (process.env.MAXIMUM_ATTENDEE_CAPACITY !== undefined)
    ? Number(process.env.MAXIMUM_ATTENDEE_CAPACITY)
    // tslint:disable-next-line:no-magic-numbers
    : 41;

export type IUpdatePerformanceAvailabilitiesOperation<T> = (
    stockRepo: StockRepo,
    performanceRepo: PerformanceRepo,
    performanceAvailabilityRepo: PerformanceAvailabilityRepo
) => Promise<T>;

/**
 * パフォーマンスの在庫状況を更新する
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
        const performances = await performanceRepo.search(
            {
                startFrom: params.startFrom,
                startThrough: params.startThrough
            },
            {
                _id: 1
            }
        );
        debug(performances.length, 'performances found.');

        // パフォーマンスごとに在庫数を集計
        debug('aggregating...');
        const availabilities: factory.performance.IAvailability[] = await Promise.all(performances.map(async (performance) => {
            let remainingAttendeeCapacity = MAXIMUM_ATTENDEE_CAPACITY;

            try {
                const unavailableSeats = await stockRepo.findUnavailableOffersByEventId({ eventId: performance.id });
                remainingAttendeeCapacity -= unavailableSeats.length;
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            return { id: performance.id, remainingAttendeeCapacity: remainingAttendeeCapacity };
        }));

        debug(`storing ${availabilities.length} performanceAvailabilities...`);
        await performanceAvailabilityRepo.store(availabilities, params.ttl);
        debug('performanceAvailabilities stored.');
    };
}

/**
 * パフォーマンスの券種ごとに在庫状況を更新する
 */
export function updatePerformanceOffersAvailability(params: {
    startFrom: Date;
    startThrough: Date;
}) {
    return async (
        stockRepo: StockRepo,
        performanceRepo: PerformanceRepo,
        seatReservationOfferAvailabilityRepo: SeatReservationOfferAvailabilityRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo
    ) => {
        debug('finding performances...');
        const performances = await performanceRepo.search(
            {
                startFrom: params.startFrom,
                startThrough: params.startThrough
            },
            {
                _id: 1,
                ticket_type_group: 1,
                start_date: 1
            }
        );
        debug('performances found.', performances.length);

        // パフォーマンスごとに在庫数を集計、その券種のavailabilityを作成する
        await Promise.all(performances.map(async (performance) => {
            let remainingAttendeeCapacity = MAXIMUM_ATTENDEE_CAPACITY;

            try {
                const unavailableSeats = await stockRepo.findUnavailableOffersByEventId({ eventId: performance.id });
                remainingAttendeeCapacity -= unavailableSeats.length;
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            // 券種ごとにavailabilityを作成する
            const ticketTypes = performance.ticket_type_group.ticket_types;
            const performanceStartDate = moment(performance.start_date).toDate();

            await Promise.all(ticketTypes.map(async (ticketType) => {
                const requiredNum = ticketType.ttts_extension.required_seat_num;

                // 基本は、在庫なしであれば0、あれば必要座席数から算出
                let availableNum: number = 0;
                // 必要座席数が正の値で、残席数があれば、在庫を算出
                if (requiredNum > 0 && remainingAttendeeCapacity !== undefined) {
                    availableNum = Math.floor(remainingAttendeeCapacity / requiredNum);
                }

                // 流入制限ありの場合は、そちらを考慮して在庫数を上書き
                if (ticketType.rate_limit_unit_in_seconds > 0) {
                    try {
                        const rateLimitKey = {
                            performanceStartDate: performanceStartDate,
                            ticketTypeCategory: ticketType.ttts_extension.category,
                            unitInSeconds: ticketType.rate_limit_unit_in_seconds
                        };
                        const rateLimitHolder = await ticketTypeCategoryRateLimitRepo.getHolder(rateLimitKey);

                        // 流入制限保持者がいない、かつ、在庫必要数あれば、在庫数は固定で1、いれば0
                        availableNum = (rateLimitHolder === null && availableNum > 0) ? 1 : 0;
                    } catch (error) {
                        // tslint:disable-next-line:no-console
                        console.error(error);
                    }
                }

                // 券種ごとの在庫数をDBに保管
                await seatReservationOfferAvailabilityRepo.save(
                    performance.id, ticketType.id, availableNum
                );
            }));
        }));
    };
}
