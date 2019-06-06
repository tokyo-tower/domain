/**
 * 予約サービス
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '@motionpicture/ttts-factory';

import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { RedisRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TaskRepo } from '../repo/task';

const debug = createDebug('ttts-domain:service');

/**
 * 予約をキャンセルする
 */
export function cancelReservation(params: { id: string }) {
    return async (repos: {
        reservation: ReservationRepo;
        stock: StockRepo;
        task: TaskRepo;
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
                    seatNumber: stock.seat_code,
                    seatSection: ''
                }
            };
            debug('checking stock...', stock, lockKey);
            const holder = await repos.stock.getHolder(lockKey);
            debug('holder:', holder);
            if (holder === stock.holder) {
                debug('unlocking...', lockKey);
                await repos.stock.unlock(lockKey);
                debug('unlocked', lockKey);
            }
        }));
        debug(reservation.stocks.length, 'stock(s) returned in stock.');

        const task: factory.task.aggregateEventReservations.IAttributes = {
            name: factory.taskName.AggregateEventReservations,
            status: factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: {
                id: reservation.performance
            }
        };
        await repos.task.save(task);
    };
}
