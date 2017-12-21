/**
 * 注文サービス
 * @namespace service.order
 */

import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';
// @ts-ignore
import * as difference from 'lodash.difference';
// @ts-ignore
import * as uniq from 'lodash.uniq';
import * as moment from 'moment';

import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as factory from '../factory';

import * as ReturnOrderTransactionService from './transaction/returnOrder';

const debug = createDebug('ttts-domain:service:order');

export type IPerformanceAndTaskOperation<T> = (performanceRepo: PerformanceRepo, taskRepo: TaskRepo) => Promise<T>;

/**
 * 返品処理を実行する
 * リトライ可能なように実装すること
 * @param {IReturnOrderTransaction} returnOrderTransaction
 */
export function processReturn(returnOrderTransactionId: string) {
    // tslint:disable-next-line:max-func-body-length
    return async (
        performanceRepo: PerformanceRepo,
        reservationRepo: ReservationRepo,
        stockRepo: StockRepo,
        transactionRepo: TransactionRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo
    ) => {
        debug('finding returnOrder transaction...');
        const returnOrderTransaction = await transactionRepo.transactionModel.findById(returnOrderTransactionId)
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('transaction');
                }

                return <factory.transaction.returnOrder.ITransaction>doc.toObject();
            });
        debug('processing return order...', returnOrderTransaction);

        const creditCardAuthorizeAction = <factory.action.authorize.creditCard.IAction>
            returnOrderTransaction.object.transaction.object.authorizeActions
                .filter((action) => action.actionStatus === factory.actionStatusType.CompletedActionStatus)
                .find((action) => action.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.CreditCard);
        const entryTranArgs = (<factory.action.authorize.creditCard.IResult>creditCardAuthorizeAction.result).entryTranArgs;
        const execTranArgs = (<factory.action.authorize.creditCard.IResult>creditCardAuthorizeAction.result).execTranArgs;

        const placeOrderTransactionResult = <factory.transaction.placeOrder.IResult>returnOrderTransaction.object.transaction.result;
        const creditCardSalesBefore = <factory.transaction.placeOrder.ICreditCardSales>placeOrderTransactionResult.creditCardSales;
        const orderId = placeOrderTransactionResult.eventReservations[0].gmo_order_id;

        // 取引状態参照
        const searchTradeResult = await GMO.services.credit.searchTrade({
            shopId: entryTranArgs.shopId,
            shopPass: entryTranArgs.shopPass,
            orderId: orderId
        });
        debug('searchTradeResult:', searchTradeResult);

        // GMO取引状態に変更がなければ金額変更
        debug('trade already changed?', (searchTradeResult.tranId !== creditCardSalesBefore.tranId));
        if (searchTradeResult.tranId === creditCardSalesBefore.tranId) {
            // 手数料0円であれば、決済取り消し(返品)処理
            if (returnOrderTransaction.object.cancellationFee === 0) {
                debug(`altering tran. ${GMO.utils.util.JobCd.Return}..`, orderId);
                const alterTranResult = await GMO.services.credit.alterTran({
                    shopId: entryTranArgs.shopId,
                    shopPass: entryTranArgs.shopPass,
                    accessId: execTranArgs.accessId,
                    accessPass: execTranArgs.accessPass,
                    jobCd: GMO.utils.util.JobCd.Return
                });
                // クレジットカード取引結果を返品取引結果に連携
                await transactionRepo.transactionModel.findByIdAndUpdate(
                    returnOrderTransaction.id,
                    {
                        'result.returnCreditCardResult': alterTranResult
                    }
                ).exec();

                // パフォーマンスに返品済数を連携
                await performanceRepo.performanceModel.findByIdAndUpdate(
                    placeOrderTransactionResult.eventReservations[0].performance,
                    {
                        $inc: {
                            'ttts_extension.refunded_count': 1,
                            'ttts_extension.unrefunded_count': -1
                        },
                        'ttts_extension.refund_update_at': new Date()
                    }
                ).exec();

                // すべて返金完了したら、返金ステータス変更
                await performanceRepo.performanceModel.findOneAndUpdate(
                    {
                        _id: placeOrderTransactionResult.eventReservations[0].performance,
                        'ttts_extension.unrefunded_count': 0
                    },
                    {
                        'ttts_extension.refund_status': factory.performance.RefundStatus.Compeleted,
                        'ttts_extension.refund_update_at': new Date()
                    }
                ).exec();
            } else {
                debug('changing amount...', orderId);
                const changeTranResult = await GMO.services.credit.changeTran({
                    shopId: entryTranArgs.shopId,
                    shopPass: entryTranArgs.shopPass,
                    accessId: execTranArgs.accessId,
                    accessPass: execTranArgs.accessPass,
                    jobCd: GMO.utils.util.JobCd.Capture,
                    amount: returnOrderTransaction.object.cancellationFee
                });
                // クレジットカード取引結果を返品取引結果に連携
                await transactionRepo.transactionModel.findByIdAndUpdate(
                    returnOrderTransaction.id,
                    {
                        'result.changeCreditCardAmountResult': changeTranResult
                    }
                ).exec();
            }
        }

        await Promise.all(placeOrderTransactionResult.eventReservations.map(async (reservation) => {
            // 車椅子の流入制限解放
            if (
                reservation.status === factory.reservationStatusType.ReservationConfirmed
                && reservation.rate_limit_unit_in_seconds > 0
            ) {
                debug('resetting wheelchair rate limit...');
                const performanceStartDate = moment(
                    `${reservation.performance_day} ${reservation.performance_start_time}00+09:00`, 'YYYYMMDD HHmmssZ'
                ).toDate();
                const rateLimitKey = {
                    performanceStartDate: performanceStartDate,
                    ticketTypeCategory: reservation.ticket_ttts_extension.category,
                    unitInSeconds: reservation.rate_limit_unit_in_seconds
                };
                await ticketTypeCategoryRateLimitRepo.unlock(rateLimitKey);
                debug('wheelchair rate limit reset.');
            }

            // 予約をキャンセル
            debug('canceling a reservation...', reservation.qr_str);
            await reservationRepo.reservationModel.findOneAndUpdate(
                { qr_str: reservation.qr_str },
                { status: factory.reservationStatusType.ReservationCancelled }
            ).exec();

            // 在庫を空きに(在庫IDに対して、元の状態に戻す)
            debug('making a stock available...', reservation.stock);
            await stockRepo.stockModel.findOneAndUpdate(
                {
                    _id: reservation.stock,
                    availability: reservation.stock_availability_after,
                    holder: returnOrderTransaction.object.transaction.id // 対象取引に保持されている
                },
                {
                    $set: { availability: reservation.stock_availability_before },
                    $unset: { holder: 1 }
                }
            ).exec();
        }));
    };
}

/**
 * パフォーマンス指定で全注文を返品する
 */
export function returnAllByPerformance(
    agentId: string, performanceId: string
): IPerformanceAndTaskOperation<factory.task.returnOrdersByPerformance.ITask> {
    return async (performanceRepo: PerformanceRepo, taskRepo: TaskRepo) => {
        // パフォーマンス情報取得
        const performance = await performanceRepo.findById(performanceId);
        debug('starting returnOrders by performance...', performance.id);

        // 終了済かどうか
        const now = moment();
        const endDate = moment(`${performance.day} ${performance.end_time}00+09:00`, 'YYYYMMDD HHmmssZ');
        debug(now, endDate);
        if (endDate >= now) {
            throw new Error('上映が終了していないので返品処理を実行できません。');
        }

        const taskAttribute = factory.task.returnOrdersByPerformance.createAttributes({
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: {
                agentId: agentId,
                performanceId: performanceId
            }
        });

        return taskRepo.save(taskAttribute);
    };
}

export function processReturnAllByPerformance(agentId: string, performanceId: string) {
    return async (performanceRepo: PerformanceRepo, reservationRepo: ReservationRepo, transactionRepo: TransactionRepo) => {
        // パフォーマンスに対する取引リストを、予約コレクションから検索する
        const reservations = await reservationRepo.reservationModel.find(
            {
                status: factory.reservationStatusType.ReservationConfirmed,
                performance: performanceId,
                purchaser_group: factory.person.Group.Customer
            },
            'transaction checkins'
        ).exec();

        // 入場履歴なしの取引IDを取り出す
        let transactionIds = reservations.map((r) => r.get('transaction'));
        const transactionsIdsWithCheckins = reservations.filter((r) => (r.get('checkins').length > 0)).map((r) => r.get('transaction'));
        debug(transactionIds, transactionsIdsWithCheckins);
        transactionIds = uniq(difference(transactionIds, transactionsIdsWithCheckins));
        debug('confirming returnOrderTransactions...', transactionIds);

        // パフォーマンスに返金対対象数を追加する
        await performanceRepo.performanceModel.findByIdAndUpdate(
            performanceId,
            {
                'ttts_extension.refunded_count': 0, // 返金済数は最初0
                'ttts_extension.unrefunded_count': transactionIds.length, // 未返金数をセット
                'ttts_extension.refund_status': factory.performance.RefundStatus.Instructed,
                'ttts_extension.refund_update_at': new Date()
            }
        ).exec();

        // 返品取引作成(実際の返品処理は非同期で実行される)
        await Promise.all(transactionIds.map(async (transactionId) => {
            await ReturnOrderTransactionService.confirm({
                agentId: agentId,
                transactionId: transactionId,
                cancellationFee: 0,
                forcibly: true
            })(transactionRepo);
        }));

        debug('returnOrders by performance started.');
    };
}
