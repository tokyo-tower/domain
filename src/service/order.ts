/**
 * 注文サービス
 * @namespace service.order
 */

import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';
import * as Email from 'email-templates';
// @ts-ignore
import * as difference from 'lodash.difference';
// @ts-ignore
import * as uniq from 'lodash.uniq';
import * as moment from 'moment-timezone';
import * as numeral from 'numeral';

import { MongoRepository as OrderRepo } from '../repo/order';
import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as factory from '@motionpicture/ttts-factory';

import * as ReturnOrderTransactionService from './transaction/returnOrder';

const debug = createDebug('ttts-domain:service');

export type IPerformanceAndTaskOperation<T> = (performanceRepo: PerformanceRepo, taskRepo: TaskRepo) => Promise<T>;

export function createFromTransaction(transactionId: string) {
    return async (orderRepo: OrderRepo, transactionRepo: TransactionRepo) => {
        const transaction = await transactionRepo.findPlaceOrderById(transactionId);

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (transaction.result !== undefined) {
            await orderRepo.save(transaction.result.order);
        }
    };
}

/**
 * 返品処理を実行する
 * リトライ可能なように実装すること
 * @param returnOrderTransactionId 返品取引ID
 */
export function processReturn(returnOrderTransactionId: string) {
    return async (
        performanceRepo: PerformanceRepo,
        reservationRepo: ReservationRepo,
        stockRepo: StockRepo,
        transactionRepo: TransactionRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
        taskRepo: TaskRepo,
        orderRepo: OrderRepo
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

        await returnCreditCardSales(returnOrderTransactionId)(performanceRepo, transactionRepo);

        await notifyReturnOrder(returnOrderTransactionId)(transactionRepo, taskRepo);

        await cancelReservations(returnOrderTransactionId)(
            reservationRepo, stockRepo, transactionRepo, ticketTypeCategoryRateLimitRepo
        );

        // 注文を返品済ステータスに変更
        const placeOrderTransactionResult = <factory.transaction.placeOrder.IResult>returnOrderTransaction.object.transaction.result;
        await orderRepo.orderModel.findOneAndUpdate(
            { orderNumber: placeOrderTransactionResult.order.orderNumber },
            { orderStatus: factory.orderStatus.OrderReturned }
        ).exec();

        // 返品処理が全て完了した時点で、レポート作成タスクを追加
        const createReturnOrderReportTask = factory.task.createReturnOrderReport.createAttributes({
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: {
                transaction: returnOrderTransaction
            }
        });
        await taskRepo.save(createReturnOrderReportTask);
    };
}

/**
 * 返品処理に該当する予約を取り消す
 * @param returnOrderTransactionId 返品取引ID
 */
export function cancelReservations(returnOrderTransactionId: string) {
    return async (
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

        const placeOrderTransactionResult = <factory.transaction.placeOrder.IResult>returnOrderTransaction.object.transaction.result;

        await Promise.all(placeOrderTransactionResult.eventReservations.map(async (reservation) => {
            // 車椅子の流入制限解放
            if (
                reservation.status === factory.reservationStatusType.ReservationConfirmed
                && reservation.rate_limit_unit_in_seconds > 0
            ) {
                debug('resetting wheelchair rate limit...');
                const performanceStartDate = moment(reservation.performance_start_date).toDate();
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
            await reservationRepo.cancel(reservation);

            // 在庫を空きに(在庫IDに対して、元の状態に戻す)
            debug(`making ${reservation.stocks.length} stocks available...`);
            await Promise.all(reservation.stocks.map(async (stock) => {
                await stockRepo.unlock(stock);
            }));
        }));
    };
}

/**
 * 返品処理を受け付けたことを購入者へ通知する
 * @param returnOrderTransactionId 返品取引ID
 */
export function notifyReturnOrder(returnOrderTransactionId: string) {
    return async (
        transactionRepo: TransactionRepo,
        taskRepo: TaskRepo
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

        let emailMessageAttributes: factory.creativeWork.message.email.IAttributes;
        let emailMessage: factory.creativeWork.message.email.ICreativeWork;
        let sendEmailTaskAttributes: factory.task.sendEmailNotification.IAttributes;
        switch (returnOrderTransaction.object.reason) {
            case factory.transaction.returnOrder.Reason.Customer:
                // tslint:disable-next-line:no-suspicious-comment
                // TODO 二重送信対策
                // emailMessageAttributes = await createEmailMessage4customerReason(returnOrderTransaction.object.transaction);
                // emailMessage = factory.creativeWork.message.email.create({
                //     identifier: `returnOrderTransaction-${returnOrderTransactionId}`,
                //     sender: {
                //         typeOf: returnOrderTransaction.object.transaction.seller.typeOf,
                //         name: emailMessageAttributes.sender.name,
                //         email: emailMessageAttributes.sender.email
                //     },
                //     toRecipient: {
                //         typeOf: returnOrderTransaction.object.transaction.agent.typeOf,
                //         name: emailMessageAttributes.toRecipient.name,
                //         email: emailMessageAttributes.toRecipient.email
                //     },
                //     about: emailMessageAttributes.about,
                //     text: emailMessageAttributes.text
                // });

                // sendEmailTaskAttributes = factory.task.sendEmailNotification.createAttributes({
                //     status: factory.taskStatus.Ready,
                //     runsAt: new Date(), // なるはやで実行
                //     remainingNumberOfTries: 10,
                //     lastTriedAt: null,
                //     numberOfTried: 0,
                //     executionResults: [],
                //     data: {
                //         transactionId: returnOrderTransactionId,
                //         emailMessage: emailMessage
                //     }
                // });

                // await taskRepo.save(sendEmailTaskAttributes);

                break;

            case factory.transaction.returnOrder.Reason.Seller:
                // tslint:disable-next-line:no-suspicious-comment
                // TODO 二重送信対策
                emailMessageAttributes = await createEmailMessage4sellerReason(returnOrderTransaction.object.transaction);
                emailMessage = factory.creativeWork.message.email.create({
                    identifier: `returnOrderTransaction-${returnOrderTransactionId}`,
                    sender: {
                        typeOf: returnOrderTransaction.object.transaction.seller.typeOf,
                        name: emailMessageAttributes.sender.name,
                        email: emailMessageAttributes.sender.email
                    },
                    toRecipient: {
                        typeOf: returnOrderTransaction.object.transaction.agent.typeOf,
                        name: emailMessageAttributes.toRecipient.name,
                        email: emailMessageAttributes.toRecipient.email
                    },
                    about: emailMessageAttributes.about,
                    text: emailMessageAttributes.text
                });

                sendEmailTaskAttributes = factory.task.sendEmailNotification.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: returnOrderTransactionId,
                        emailMessage: emailMessage
                    }
                });

                await taskRepo.save(sendEmailTaskAttributes);

                break;

            default:
        }
    };
}

/**
 * クレジットカード売上があれば取り下げる処理
 * @param returnOrderTransactionId 返品取引ID
 */
export function returnCreditCardSales(returnOrderTransactionId: string) {
    // tslint:disable-next-line:max-func-body-length
    return async (
        performanceRepo: PerformanceRepo,
        transactionRepo: TransactionRepo
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

        // クレジットカードオーソリがなければ何もしない
        if (creditCardAuthorizeAction === undefined) {
            return;
        }
        // CompletedActionStatusにも関わらずresultがなければ謎のデータ
        if (creditCardAuthorizeAction.result === undefined) {
            throw new factory.errors.NotFound('creditCardAuthorizeAction.result', 'クレジットカード承認アクションに結果が見つかりません。');
        }

        const entryTranArgs = creditCardAuthorizeAction.result.entryTranArgs;
        const execTranArgs = creditCardAuthorizeAction.result.execTranArgs;

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
        const endDate = moment(performance.end_date);
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
        const reservations = await reservationRepo.search(
            {
                status: factory.reservationStatusType.ReservationConfirmed,
                performance: performanceId,
                purchaser_group: factory.person.Group.Customer
            }
        );

        // 入場履歴なしの取引IDを取り出す
        let transactionIds = reservations.map((r) => r.transaction);
        const transactionsIdsWithCheckins = reservations.filter((r) => (r.checkins.length > 0)).map((r) => r.transaction);
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
                // tslint:disable-next-line:no-suspicious-comment
                // TODO クライアント情報連携
                clientUser: <any>{},
                agentId: agentId,
                transactionId: transactionId,
                cancellationFee: 0,
                forcibly: true,
                reason: factory.transaction.returnOrder.Reason.Seller
            })(transactionRepo);
        }));

        debug('returnOrders by performance started.');
    };
}

/**
 * 販売者都合での返品メール作成
 */
async function createEmailMessage4sellerReason(
    placeOrderTransaction: factory.transaction.placeOrder.ITransaction
): Promise<factory.creativeWork.message.email.IAttributes> {
    const transactionResult = <factory.transaction.placeOrder.IResult>placeOrderTransaction.result;
    const reservation = transactionResult.eventReservations[0];

    const email = new Email({
        views: { root: `${__dirname}/../../emails` },
        message: {},
        // uncomment below to send emails in development/test env:
        // send: true
        transport: {
            jsonTransport: true
        }
        // htmlToText: false
    });

    // 券種ごとに合計枚数算出
    const ticketInfos: {
        [ticketTypeId: string]: {
            name: {
                ja: string;
                en: string;
            };
            charge: string;
            count: number;
        };
    } = {};
    transactionResult.eventReservations.forEach((r) => {
        // チケットタイプごとにチケット情報セット
        if (ticketInfos[r.ticket_type] === undefined) {
            ticketInfos[r.ticket_type] = {
                name: r.ticket_type_name,
                charge: `\\${numeral(r.charge).format('0,0')}`,
                count: 0
            };
        }

        ticketInfos[r.ticket_type].count += 1;
    });
    // 券種ごとの表示情報編集 (sort順を変えないよう同期Loop:"for of")
    const ticketInfoJa = Object.keys(ticketInfos).map((ticketTypeId) => {
        const ticketInfo = ticketInfos[ticketTypeId];

        return `${ticketInfo.name.ja} ${ticketInfo.charge} × ${ticketInfo.count}枚`;
    }).join('\n');
    const ticketInfoEn = Object.keys(ticketInfos).map((ticketTypeId) => {
        const ticketInfo = ticketInfos[ticketTypeId];

        return `${ticketInfo.name.en} ${ticketInfo.charge} × ${ticketInfo.count} ticket(s)`;
    }).join('\n');

    const message = await email.render('returnOrderBySeller', {
        purchaserNameJa: `${reservation.purchaser_last_name} ${reservation.purchaser_first_name}`,
        purchaserNameEn: reservation.purchaser_name,
        paymentNo: reservation.payment_no,
        day: moment(reservation.performance_start_date).tz('Asia/Tokyo').format('YYYY/MM/DD'),
        startTime: moment(reservation.performance_start_date).tz('Asia/Tokyo').format('HH:mm'),
        amount: numeral(transactionResult.order.price).format('0,0'),
        numberOfReservations: transactionResult.eventReservations.length,
        ticketInfoJa,
        ticketInfoEn
    });
    debug('message:', message);

    return {
        sender: {
            name: 'Tokyo Tower TOP DECK TOUR Online Ticket',
            email: 'noreply@tokyotower.co.jp'
        },
        toRecipient: {
            name: reservation.purchaser_name,
            email: reservation.purchaser_email
        },
        about: '東京タワートップデッキツアー 返金完了のお知らせ (Payment Refund Notification for the Tokyo Tower Top Deck Tour)',
        text: message
    };
}
