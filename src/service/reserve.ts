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

const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;

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

        let ticketTypeCategory = ((<any>reservation).ticket_ttts_extension !== undefined)
            ? (<any>reservation).ticket_ttts_extension.category
            : ''; // 互換性維持のため
        if (Array.isArray(reservation.reservedTicket.ticketType.additionalProperty)) {
            const categoryProperty = reservation.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
            if (categoryProperty !== undefined) {
                ticketTypeCategory = categoryProperty.value;
            }
        }

        // 券種による流入制限解放
        if (
            reservation.status === factory.reservationStatusType.ReservationConfirmed
            && ticketTypeCategory === factory.ticketTypeCategory.Wheelchair
        ) {
            await repos.ticketTypeCategoryRateLimit.unlock({
                ticketTypeCategory: ticketTypeCategory,
                performanceStartDate: moment(reservation.reservationFor.startDate).toDate(),
                unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
            });
            debug('rate limit reset.');
        }

        // 車椅子余分確保があればそちらもキャンセル
        if (reservation.additionalProperty !== undefined) {
            const extraSeatNumbersProperty = reservation.additionalProperty.find((p) => p.name === 'extraSeatNumbers');
            if (extraSeatNumbersProperty !== undefined) {
                const extraSeatNumbers = JSON.parse(extraSeatNumbersProperty.value);

                // このイベントの予約から余分確保分を検索
                if (Array.isArray(extraSeatNumbers) && extraSeatNumbers.length > 0) {
                    extraReservations = await repos.reservation.search({
                        typeOf: factory.reservationType.EventReservation,
                        reservationFor: { id: reservation.reservationFor.id },
                        reservationNumbers: [reservation.reservationNumber],
                        reservedTicket: {
                            ticketedSeat: { seatNumbers: extraSeatNumbers }
                        }
                    });
                }
            }
        }

        const targetReservations = [reservation, ...extraReservations];

        await Promise.all(targetReservations.map(async (r) => {
            await repos.reservation.cancel({ id: r.id });

            if (r.reservedTicket.ticketedSeat !== undefined) {
                const lockKey = {
                    eventId: reservation.reservationFor.id,
                    offer: {
                        seatNumber: r.reservedTicket.ticketedSeat.seatNumber,
                        seatSection: r.reservedTicket.ticketedSeat.seatSection
                    }
                };
                const holder = await repos.stock.getHolder(lockKey);
                let transactionId = (<any>r).transaction; // 互換性維持のため
                if (r.underName !== undefined && Array.isArray(r.underName.identifier)) {
                    const transactionProperty = r.underName.identifier.find((p) => p.name === 'transaction');
                    if (transactionProperty !== undefined) {
                        transactionId = transactionProperty.value;
                    }
                }
                if (holder === transactionId) {
                    await repos.stock.unlock(lockKey);
                }
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
                id: reservation.reservationFor.id
            }
        };
        await repos.task.save(task);
    };
}
