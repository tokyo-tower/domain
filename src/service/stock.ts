/**
 * 在庫の管理に対して責任を負うサービス
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '@motionpicture/ttts-factory';

import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../repo/action/authorize/seatReservation';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { RedisRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('ttts-domain:service');

const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;

/**
 * 仮予約承認取消
 */
export function cancelSeatReservationAuth(transactionId: string) {
    return async (
        seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
        stockRepo: StockRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
        taskRepo: TaskRepo
    ) => {
        // 座席仮予約アクションを取得
        const authorizeActions: factory.action.authorize.seatReservation.IAction[] =
            await seatReservationAuthorizeActionRepo.findByTransactionId(transactionId)
                .then((actions) => actions.filter((action) => action.actionStatus === factory.actionStatusType.CompletedActionStatus));

        await Promise.all(authorizeActions.map(async (action) => {
            debug('calling deleteTmpReserve...', action);

            const performance = action.object.performance;

            // 在庫を元の状態に戻す
            const tmpReservations = (<factory.action.authorize.seatReservation.IResult>action.result).tmpReservations;

            await Promise.all(tmpReservations.map(async (tmpReservation) => {
                const ticketedSeat = tmpReservation.reservedTicket.ticketedSeat;
                if (ticketedSeat !== undefined) {
                    const lockKey = {
                        eventId: performance.id,
                        offer: {
                            seatNumber: ticketedSeat.seatNumber,
                            seatSection: ticketedSeat.seatSection
                        }
                    };
                    const holder = await stockRepo.getHolder(lockKey);
                    if (holder === transactionId) {
                        await stockRepo.unlock(lockKey);
                    }
                }

                let ticketTypeCategory = factory.ticketTypeCategory.Normal;
                if (Array.isArray(tmpReservation.reservedTicket.ticketType.additionalProperty)) {
                    const categoryProperty = tmpReservation.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
                    if (categoryProperty !== undefined) {
                        ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                    }
                }

                if (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair) {
                    debug('resetting wheelchair rate limit...');
                    const performanceStartDate = moment(`${performance.startDate}`).toDate();
                    const rateLimitKey = {
                        performanceStartDate: performanceStartDate,
                        ticketTypeCategory: ticketTypeCategory,
                        unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                    };
                    await ticketTypeCategoryRateLimitRepo.unlock(rateLimitKey);
                    debug('wheelchair rate limit reset.');
                }
            }));

            // 集計タスク作成
            const aggregateTask: factory.task.aggregateEventReservations.IAttributes = {
                name: factory.taskName.AggregateEventReservations,
                status: factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                // tslint:disable-next-line:no-null-keyword
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { id: performance.id }
            };
            await taskRepo.save(aggregateTask);
        }));
    };
}

/**
 * 仮予約→本予約
 */
export function transferSeatReservation(transactionId: string) {
    return async (transactionRepo: TransactionRepo, reservationRepo: ReservationRepo, taskRepo: TaskRepo) => {
        const transaction = await transactionRepo.findPlaceOrderById(transactionId);
        const reservations = (<factory.transaction.placeOrder.IResult>transaction.result).order.acceptedOffers
            .map((o) => o.itemOffered);

        await Promise.all(reservations.map(async (reservation) => {
            /// 予約データを作成する
            await reservationRepo.saveEventReservation(reservation);

            // 集計タスク作成
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
            await taskRepo.save(task);
        }));
    };
}
