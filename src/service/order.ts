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
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as errors from '../factory/errors';
import { RefundStatus } from '../factory/performance';
import { Group as PersonGroup } from '../factory/person';
import ReservationStatusType from '../factory/reservationStatusType';
import * as ReturnOrdersByPerformanceTaskFactory from '../factory/task/returnOrdersByPerformance';
import TaskStatus from '../factory/taskStatus';
import * as PlaceOrderTransactionFactory from '../factory/transaction/placeOrder';
import * as ReturnOrderTransactionFactory from '../factory/transaction/returnOrder';

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
        transactionRepo: TransactionRepo
    ) => {
        debug('finding returnOrder transaction...');
        const returnOrderTransaction = await transactionRepo.transactionModel.findById(returnOrderTransactionId)
            .then((doc) => {
                if (doc === null) {
                    throw new errors.NotFound('transaction');
                }

                return <ReturnOrderTransactionFactory.ITransaction>doc.toObject();
            });
        debug('processing return order...', returnOrderTransaction);
        const placeOrderTransactionResult = <PlaceOrderTransactionFactory.IResult>returnOrderTransaction.object.transaction.result;
        const creditCardSalesBefore = <PlaceOrderTransactionFactory.ICreditCardSales>placeOrderTransactionResult.creditCardSales;
        const orderId = placeOrderTransactionResult.eventReservations[0].gmo_order_id;

        // 取引状態参照
        const searchTradeResult = await GMO.services.credit.searchTrade({
            shopId: <string>process.env.GMO_SHOP_ID,
            shopPass: <string>process.env.GMO_SHOP_PASS,
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
                    shopId: <string>process.env.GMO_SHOP_ID,
                    shopPass: <string>process.env.GMO_SHOP_PASS,
                    accessId: searchTradeResult.accessId,
                    accessPass: searchTradeResult.accessPass,
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
                            'ttts_extension.refunded_count': 1
                        },
                        'ttts_extension.refund_update_at': new Date()
                    }
                ).exec();
            } else {
                debug('changing amount...', orderId);
                const changeTranResult = await GMO.services.credit.changeTran({
                    shopId: <string>process.env.GMO_SHOP_ID,
                    shopPass: <string>process.env.GMO_SHOP_PASS,
                    accessId: searchTradeResult.accessId,
                    accessPass: searchTradeResult.accessPass,
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
            // 2017/11 本体チケットかつ特殊チケットの時、時間ごとの予約データ解放(AVAILABLEに変更)
            // tslint:disable-next-line:no-suspicious-comment
            // TODO
            // if (reservation.ticket_ttts_extension.category !== ttts.TicketTypeGroupUtil.TICKET_TYPE_CATEGORY_NORMAL &&
            //     reservation.seat_code === reservation.reservation_ttts_extension.seat_code_base) {
            //     await ttts.Models.ReservationPerHour.findOneAndUpdate(
            //         { reservation_id: reservation._id.toString() },
            //         {
            //             $set: { status: ttts.factory.itemAvailability.InStock },
            //             $unset: { expired_at: 1, reservation_id: 1 }
            //         },
            //         { new: true }
            //     ).exec();
            // }

            // 予約データ解放(AVAILABLEに変更)
            debug('canceling a reservation...', reservation.qr_str);
            await reservationRepo.reservationModel.findOneAndUpdate(
                { qr_str: reservation.qr_str },
                { status: ReservationStatusType.ReservationCancelled }
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
export function returnAllByPerformance(performanceId: string): IPerformanceAndTaskOperation<ReturnOrdersByPerformanceTaskFactory.ITask> {
    return async (performanceRepo: PerformanceRepo, taskRepo: TaskRepo) => {
        // パフォーマンス情報取得
        const performance = await performanceRepo.findById(performanceId);
        debug('starting returnOrders by performance...', performance._id);

        // 終了済かどうか
        const now = moment();
        const endDate = moment(`${performance.day} ${performance.end_time}00+09:00`, 'YYYYMMDD HHmmssZ');
        debug(now, endDate);
        if (endDate >= now) {
            throw new Error('上映が終了していないので返品処理を実行できません。');
        }

        const taskAttribute = ReturnOrdersByPerformanceTaskFactory.createAttributes({
            status: TaskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: {
                performanceId: performanceId
            }
        });

        return taskRepo.save(taskAttribute);
    };
}

export function processReturnAllByPerformance(performanceId: string) {
    return async (performanceRepo: PerformanceRepo, reservationRepo: ReservationRepo, transactionRepo: TransactionRepo) => {
        // パフォーマンスに対する取引リストを、予約コレクションから検索する
        const reservations = await reservationRepo.reservationModel.find(
            {
                status: ReservationStatusType.ReservationConfirmed,
                performance: performanceId,
                purchaser_group: PersonGroup.Customer
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
                'ttts_extension.refunded_count': 0,
                'ttts_extension.refund_count': transactionIds.length,
                'ttts_extension.refund_status': RefundStatus.Instructed,
                'ttts_extension.refund_update_at': new Date()
            }
        ).exec();

        // 返品取引作成(実際の返品処理は非同期で実行される)
        await Promise.all(transactionIds.map(async (transactionId) => {
            await ReturnOrderTransactionService.confirm({
                transactionId: transactionId,
                cancellationFee: 0,
                forcibly: true
            })(transactionRepo);
        }));

        debug('returnOrders by performance started.');
    };
}
