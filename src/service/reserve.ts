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
        let extraReservations: factory.reservation.event.IReservation[] = [];

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

        // 車椅子余分確保があればそちらもキャンセル
        if (reservation.additionalProperty !== undefined) {
            const extraSeatNumbersProperty = reservation.additionalProperty.find((p) => p.name === 'extraSeatNumbers');
            if (extraSeatNumbersProperty !== undefined) {
                const extraSeatNumbers = JSON.parse(extraSeatNumbersProperty.value);

                // このイベントの予約から余分確保分を検索
                extraReservations = await repos.reservation.search({
                    typeOf: factory.reservationType.EventReservation,
                    reservationFor: { id: reservation.reservationFor.id },
                    reservedTicket: {
                        ticketedSeat: { seatNumbers: extraSeatNumbers }
                    }
                });
            }
        }

        const targetReservations = [reservation, ...extraReservations];

        await Promise.all(targetReservations.map(async (r) => {
            await repos.reservation.cancel({ id: r.id });

            const lockKey = {
                eventId: reservation.performance,
                offer: {
                    seatNumber: r.seat_code,
                    seatSection: ''
                }
            };
            const holder = await repos.stock.getHolder(lockKey);
            if (holder === r.transaction) {
                await repos.stock.unlock(lockKey);
            }
        }));

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
