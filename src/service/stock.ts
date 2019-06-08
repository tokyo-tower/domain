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
            const section = performance.screen.sections[0];

            // 在庫を元の状態に戻す
            const tmpReservations = (<factory.action.authorize.seatReservation.IResult>action.result).tmpReservations;

            await Promise.all(tmpReservations.map(async (tmpReservation) => {
                await Promise.all(tmpReservation.stocks.map(async (stock) => {
                    const lockKey = {
                        eventId: performance.id,
                        offer: {
                            seatNumber: stock.seat_code,
                            seatSection: section.code
                        }
                    };
                    const holder = await stockRepo.getHolder(lockKey);
                    if (holder === stock.holder) {
                        await stockRepo.unlock(lockKey);
                    }
                }));

                if (tmpReservation.rate_limit_unit_in_seconds > 0) {
                    debug('resetting wheelchair rate limit...');
                    const performanceStartDate = moment(`${performance.start_date}`).toDate();
                    const rateLimitKey = {
                        performanceStartDate: performanceStartDate,
                        ticketTypeCategory: tmpReservation.ticket_ttts_extension.category,
                        unitInSeconds: tmpReservation.rate_limit_unit_in_seconds
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
        const eventReservations = (<factory.transaction.placeOrder.IResult>transaction.result).eventReservations;

        await Promise.all(eventReservations.map(async (eventReservation) => {
            /// 予約データを作成する
            await reservationRepo.saveEventReservation(eventReservation);

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
                    id: eventReservation.performance
                }
            };
            await taskRepo.save(task);
        }));
    };
}
