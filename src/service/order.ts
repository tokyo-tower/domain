/**
 * 注文サービス
 */
import * as cinerino from '@cinerino/domain';
import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';
import * as Email from 'email-templates';
// @ts-ignore
import * as difference from 'lodash.difference';
// @ts-ignore
import * as uniq from 'lodash.uniq';
import * as moment from 'moment-timezone';
import * as numeral from 'numeral';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as OrderRepo } from '../repo/order';
import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as factory from '@tokyotower/factory';

import * as ReserveService from './reserve';
import * as ReturnOrderTransactionService from './transaction/returnOrder';

const debug = createDebug('ttts-domain:service');

export type IPerformanceAndTaskOperation<T> = (performanceRepo: PerformanceRepo, taskRepo: TaskRepo) => Promise<T>;

export function createFromTransaction(transactionId: string) {
    return async (orderRepo: OrderRepo, transactionRepo: TransactionRepo) => {
        const transaction = await transactionRepo.findById({ typeOf: factory.transactionType.PlaceOrder, id: transactionId });

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (transaction.result !== undefined) {
            await orderRepo.createIfNotExist(transaction.result.order);
            // await orderRepo.save(transaction.result.order);
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
        actionRepo: ActionRepo,
        performanceRepo: PerformanceRepo,
        reservationRepo: ReservationRepo,
        transactionRepo: TransactionRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
        taskRepo: TaskRepo,
        orderRepo: OrderRepo,
        projectRepo: ProjectRepo
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

        await returnCreditCardSales(returnOrderTransactionId)(actionRepo, performanceRepo, transactionRepo);

        await notifyReturnOrder(returnOrderTransactionId)(transactionRepo, taskRepo);

        await cancelReservations(returnOrderTransactionId)(
            reservationRepo, transactionRepo, ticketTypeCategoryRateLimitRepo, taskRepo, projectRepo
        );

        // 注文を返品済ステータスに変更
        const placeOrderTransactionResult = <factory.transaction.placeOrder.IResult>returnOrderTransaction.object.transaction.result;
        await orderRepo.orderModel.findOneAndUpdate(
            { orderNumber: placeOrderTransactionResult.order.orderNumber },
            {
                orderStatus: factory.orderStatus.OrderReturned,
                dateReturned: new Date()
            }
        ).exec();

        // 返品処理が全て完了した時点で、レポート作成タスクを追加
        const createReturnOrderReportTask: factory.task.createReturnOrderReport.IAttributes = {
            name: <any>factory.taskName.CreatePlaceOrderReport,
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            numberOfTried: 0,
            executionResults: [],
            data: {
                transaction: returnOrderTransaction
            }
        };
        await taskRepo.save(<any>createReturnOrderReportTask);
    };
}

/**
 * 返品処理に該当する予約を取り消す
 * @param returnOrderTransactionId 返品取引ID
 */
export function cancelReservations(returnOrderTransactionId: string) {
    return async (
        reservationRepo: ReservationRepo,
        transactionRepo: TransactionRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
        taskRepo: TaskRepo,
        projectRepo: ProjectRepo
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

        await Promise.all(placeOrderTransactionResult.order.acceptedOffers.map(async (o) => {
            const reservation = <factory.cinerino.order.IReservation>o.itemOffered;

            await ReserveService.cancelReservation(reservation)({
                project: projectRepo,
                reservation: reservationRepo,
                task: taskRepo,
                ticketTypeCategoryRateLimit: ticketTypeCategoryRateLimitRepo
            });
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
                emailMessage = {
                    typeOf: factory.creativeWorkType.EmailMessage,
                    identifier: `returnOrderTransaction-${returnOrderTransactionId}`,
                    name: `returnOrderTransaction-${returnOrderTransactionId}`,
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
                };

                sendEmailTaskAttributes = {
                    name: <any>factory.taskName.SendEmailNotification,
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: returnOrderTransactionId,
                        emailMessage: emailMessage
                    }
                };

                await taskRepo.save(<any>sendEmailTaskAttributes);

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
        actionRepo: ActionRepo,
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
                .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                .find((a) => a.result.entryTranArgs !== undefined);

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
        const order = placeOrderTransactionResult.order;

        let creditCardSalesBefore: GMO.services.credit.IAlterTranResult | undefined = (<any>placeOrderTransactionResult).creditCardSales;
        if (creditCardSalesBefore === undefined) {
            const payActions = <factory.cinerino.action.trade.pay.IAction<factory.cinerino.paymentMethodType.CreditCard>[]>
                await actionRepo.search({
                    typeOf: factory.actionType.PayAction,
                    purpose: { typeOf: { $in: ['Order'] }, orderNumber: { $in: [order.orderNumber] } }
                });
            const payAction = payActions.shift();
            if (payAction !== undefined && payAction.result !== undefined && payAction.result.creditCardSales !== undefined) {
                creditCardSalesBefore = payAction.result.creditCardSales[0];
            }
        }
        if (creditCardSalesBefore === undefined) {
            throw new Error('Credit Card Sales not found');
        }

        const reservation = <factory.cinerino.order.IReservation>placeOrderTransactionResult.order.acceptedOffers[0].itemOffered;
        let orderId = (<any>reservation).gmo_order_id; // 互換性維持のため
        if (reservation.underName !== undefined && Array.isArray(reservation.underName.identifier)) {
            const orderIdProperty = reservation.underName.identifier.find((p) => p.name === 'gmoOrderId');
            if (orderIdProperty !== undefined) {
                orderId = orderIdProperty.value;
            }
        }

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
                await performanceRepo.updateOne(
                    // tslint:disable-next-line:max-line-length
                    { _id: (<factory.cinerino.order.IReservation>placeOrderTransactionResult.order.acceptedOffers[0].itemOffered).reservationFor.id },
                    {
                        $inc: {
                            'ttts_extension.refunded_count': 1,
                            'ttts_extension.unrefunded_count': -1
                        },
                        'ttts_extension.refund_update_at': new Date()
                    }
                );

                // すべて返金完了したら、返金ステータス変更
                await performanceRepo.updateOne(
                    {
                        // tslint:disable-next-line:max-line-length
                        _id: (<factory.cinerino.order.IReservation>placeOrderTransactionResult.order.acceptedOffers[0].itemOffered).reservationFor.id,
                        'ttts_extension.unrefunded_count': 0
                    },
                    {
                        'ttts_extension.refund_status': factory.performance.RefundStatus.Compeleted,
                        'ttts_extension.refund_update_at': new Date()
                    }
                );
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
    agentId: string, performanceId: string, clientIds: string[]
): IPerformanceAndTaskOperation<factory.task.returnOrdersByPerformance.ITask> {
    return async (performanceRepo: PerformanceRepo, taskRepo: TaskRepo) => {
        // パフォーマンス情報取得
        const performance = await performanceRepo.findById(performanceId);
        debug('starting returnOrders by performance...', performance.id);

        // 終了済かどうか
        const now = moment();
        const endDate = moment(performance.endDate);
        debug(now, endDate);
        if (endDate >= now) {
            throw new Error('上映が終了していないので返品処理を実行できません。');
        }

        const taskAttribute: factory.task.returnOrdersByPerformance.IAttributes = {
            name: <any>factory.taskName.ReturnOrdersByPerformance,
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            numberOfTried: 0,
            executionResults: [],
            data: {
                agentId: agentId,
                performanceId: performanceId,
                clientIds: clientIds
            }
        };

        return <any>taskRepo.save(<any>taskAttribute);
    };
}

export function processReturnAllByPerformance(agentId: string, performanceId: string, clientIds: string[]) {
    return async (
        invoiceRepo: cinerino.repository.Invoice,
        performanceRepo: PerformanceRepo,
        reservationRepo: ReservationRepo,
        transactionRepo: TransactionRepo
    ) => {
        // パフォーマンスに対する取引リストを、予約コレクションから検索する
        const reservations = (clientIds.length > 0)
            ? await reservationRepo.search(
                {
                    typeOf: factory.chevre.reservationType.EventReservation,
                    reservationStatuses: [factory.chevre.reservationStatusType.ReservationConfirmed],
                    reservationFor: { id: performanceId },
                    underName: {
                        identifiers: clientIds.map((clientId) => {
                            return { name: 'clientId', value: clientId };
                        })
                    }
                }
            )
            : [];

        // 入場履歴なしの取引IDを取り出す
        let transactionIds = reservations.map((r) => {
            let transactionId = (<any>r).transaction; // 互換性維持のため
            if (r.underName !== undefined && Array.isArray(r.underName.identifier)) {
                const transactionProperty = r.underName.identifier.find((p) => p.name === 'transaction');
                if (transactionProperty !== undefined) {
                    transactionId = transactionProperty.value;
                }
            }

            return transactionId;
        });
        const transactionsIdsWithCheckins = reservations.filter((r) => (r.checkins.length > 0))
            .map((r) => {
                let transactionId = (<any>r).transaction; // 互換性維持のため
                if (r.underName !== undefined && Array.isArray(r.underName.identifier)) {
                    const transactionProperty = r.underName.identifier.find((p) => p.name === 'transaction');
                    if (transactionProperty !== undefined) {
                        transactionId = transactionProperty.value;
                    }
                }

                return transactionId;
            });
        debug(transactionIds, transactionsIdsWithCheckins);
        transactionIds = uniq(difference(transactionIds, transactionsIdsWithCheckins));
        debug('confirming returnOrderTransactions...', transactionIds);

        // パフォーマンスに返金対対象数を追加する
        await performanceRepo.updateOne(
            { _id: performanceId },
            {
                'ttts_extension.refunded_count': 0, // 返金済数は最初0
                'ttts_extension.unrefunded_count': transactionIds.length, // 未返金数をセット
                'ttts_extension.refund_status': factory.performance.RefundStatus.Instructed,
                'ttts_extension.refund_update_at': new Date()
            }
        );

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
            })({
                invoice: invoiceRepo,
                transaction: transactionRepo
            });
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
    const order = transactionResult.order;
    const reservation = <factory.cinerino.order.IReservation>transactionResult.order.acceptedOffers[0].itemOffered;

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
    transactionResult.order.acceptedOffers.forEach((o) => {
        const r = <factory.cinerino.order.IReservation>o.itemOffered;
        const unitPrice = (r.reservedTicket.ticketType.priceSpecification !== undefined)
            ? r.reservedTicket.ticketType.priceSpecification.price
            : 0;

        // チケットタイプごとにチケット情報セット
        if (ticketInfos[r.reservedTicket.ticketType.id] === undefined) {
            ticketInfos[r.reservedTicket.ticketType.id] = {
                name: r.reservedTicket.ticketType.name,
                charge: `\\${numeral(unitPrice).format('0,0')}`,
                count: 0
            };
        }

        ticketInfos[r.reservedTicket.ticketType.id].count += 1;
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
        purchaserNameJa: `${order.customer.familyName} ${order.customer.givenName}`,
        purchaserNameEn: order.customer.name,
        // tslint:disable-next-line:no-magic-numbers
        paymentNo: order.confirmationNumber.slice(-6),
        day: moment(reservation.reservationFor.startDate).tz('Asia/Tokyo').format('YYYY/MM/DD'),
        startTime: moment(reservation.reservationFor.startDate).tz('Asia/Tokyo').format('HH:mm'),
        amount: numeral(transactionResult.order.price).format('0,0'),
        numberOfReservations: transactionResult.order.acceptedOffers.length,
        ticketInfoJa,
        ticketInfoEn
    });
    debug('message:', message);

    return {
        typeOf: factory.creativeWorkType.EmailMessage,
        sender: {
            typeOf: factory.organizationType.Corporation,
            name: 'Tokyo Tower TOP DECK TOUR Online Ticket',
            email: 'noreply@tokyotower.co.jp'
        },
        toRecipient: {
            typeOf: factory.personType.Person,
            name: (order.customer.name !== undefined) ? order.customer.name : '',
            email: (order.customer.email !== undefined) ? order.customer.email : ''
        },
        about: '東京タワートップデッキツアー 返金完了のお知らせ (Payment Refund Notification for the Tokyo Tower Top Deck Tour)',
        text: message
    };
}
