/**
 * 予約サービス
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '@motionpicture/ttts-factory';

import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { RedisRepository as StockRepo } from '../repo/stock';
// import { MongoRepository as TaskRepo } from '../repo/task';

const debug = createDebug('ttts-domain:service');

/**
 * 予約をキャンセルする
 */
export function cancelReservation(params: { id: string }) {
    return async (repos: {
        reservation: ReservationRepo;
        // task: TaskRepo;
        stock: StockRepo;
        ticketTypeCategoryRateLimit: TicketTypeCategoryRateLimitRepo;
    }) => {
        const reservation = await repos.reservation.findById(params);

        // 券種による流入制限解放
        if (
            reservation.status === factory.reservationStatusType.ReservationConfirmed
            && reservation.rate_limit_unit_in_seconds > 0
        ) {
            await repos.ticketTypeCategoryRateLimit.unlock({
                ticketTypeCategory: reservation.ticket_ttts_extension.category,
                performanceStartDate: moment(reservation.performance_start_date).toDate(),
                unitInSeconds: reservation.rate_limit_unit_in_seconds
            });
            debug('rate limit reset.');
        }

        await repos.reservation.cancel({ id: reservation.id });

        // 在庫を空きに(在庫IDに対して、元の状態に戻す)
        await Promise.all(reservation.stocks.map(async (stock) => {
            const lockKey = {
                eventId: reservation.performance,
                offer: {
                    seatNumber: '',
                    seatSection: stock.seat_code
                }
            };
            const holder = await repos.stock.getHolder(lockKey);
            if (holder === reservation.transaction) {
                await repos.stock.unlock(lockKey);
            }
        }));
        debug(reservation.stocks.length, 'stock(s) returned in stock.');

        // const aggregateTask: factory.task.aggregateScreeningEvent.IAttributes = {
        //     project: actionAttributesList[0].project,
        //     name: factory.taskName.AggregateScreeningEvent,
        //     status: factory.taskStatus.Ready,
        //     runsAt: new Date(), // なるはやで実行
        //     remainingNumberOfTries: 10,
        //     numberOfTried: 0,
        //     executionResults: [],
        //     data: actionAttributesList[0].object.reservationFor
        // };
        // await repos.task.save(aggregateTask);
    };
}
