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

import * as factory from '@motionpicture/ttts-factory';

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
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
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

        // メール通知があれば実行
        // tslint:disable-next-line:no-suspicious-comment
        // TODO 二重送信対策
        if ((<any>returnOrderTransaction.object).emailMessageAttributes !== undefined) {
            const emailMessageAttributes = (<any>returnOrderTransaction.object).emailMessageAttributes;
            const emailMessage = factory.creativeWork.message.email.create({
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

            const taskAttributes = factory.task.sendEmailNotification.createAttributes({
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

            await taskRepo.save(taskAttributes);
        }

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
        const reservations = await reservationRepo.reservationModel.find(
            {
                status: factory.reservationStatusType.ReservationConfirmed,
                performance: performanceId,
                purchaser_group: factory.person.Group.Customer
            },
            'transaction checkins'
        ).exec().then((docs) => docs.map((doc) => <factory.reservation.event.IReservation>doc.toObject()));

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
            // 返品処理後のメール通知を作成
            const reservationsFromTransaction = reservations.filter((r) => r.transaction === transactionId);
            const emailMessageAttributes = createEmail(reservationsFromTransaction);

            await ReturnOrderTransactionService.confirm({
                agentId: agentId,
                transactionId: transactionId,
                cancellationFee: 0,
                forcibly: true,
                emailMessageAttributes: emailMessageAttributes
            })(transactionRepo);
        }));

        debug('returnOrders by performance started.');
    };
}

/**
 * 返金メール作成(1通)
 */
function createEmail(
    reservations: factory.reservation.event.IReservation[]
): factory.creativeWork.message.email.IAttributes {
    const reservation = reservations[0];
    // 本文編集(日本語)
    const infoJa = getEmailMessages(reservation, 'ja');
    const contentJa: string = `${infoJa.titleEmail}\n\n${infoJa.purchaserName}\n\n${infoJa.messageInfos.join('\n')}`;

    // 本文編集(英語)
    const infoEn = getEmailMessages(reservation, 'en');
    const contentEn: string = `${infoEn.titleEmail}\n\n${infoEn.purchaserName}\n\n${infoEn.messageInfos.join('\n')}`;

    const line: string = '--------------------------------------------------';

    return {
        sender: {
            name: 'TTTS_EVENT_NAME Online Ticket [dev]',
            email: 'noreply@default.ttts.motionpicture.jp'
        },
        toRecipient: {
            // tslint:disable-next-line:max-line-length
            name: reservations[0].purchaser_name,
            email: reservation.purchaser_email
        },
        about: `${infoJa.title} ${infoJa.titleEmail} (${infoEn.title} ${infoEn.titleEmail})`,
        text: `${contentJa}\n\n${line}\n${contentEn}`
    };
}

/**
 * メールメッセージ取得
 *
 * @param {any} reservation
 * @param {any} locale
 * @return {any}
 */
function getEmailMessages(reservation: factory.reservation.event.IReservation, locale: string) {
    // 購入者氏名
    const purchaserName = reservation.purchaser_name;
    // 入塔日
    // const day: string = moment(reservation.performance_day, 'YYYYMMDD').format('YYYY/MM/DD');
    // tslint:disable-next-line:no-magic-numbers
    // const time: string = `${reservation.performance_start_time.substr(0, 2)}:${reservation.performance_start_time.substr(2, 2)}`;
    // 返金額
    // const amount: string = numeral(reservation.gmo_amount).format('0,0');
    // 返金メールメッセージ
    // const messages: string[] = conf.get<string[]>(`emailRefund.${locale}.messages`);
    // 購入チケット情報
    const messageInfos: string[] = [];
    // for (const message of messages) {
    //     let editMessage: string = message;
    //     // 購入番号 : 850000001
    //     editMessage = editMessage.replace('$payment_no$', reservation.payment_no);
    //     // ご来塔日時 : 2017/12/10 09:15
    //     editMessage = editMessage.replace('$day$', day);
    //     editMessage = editMessage.replace('$start_time$', time);
    //     // 返金金額 : \8,400
    //     editMessage = editMessage.replace('$amount$', amount);
    //     messageInfos.push(editMessage);
    // }

    return {
        // 東京タワー TOP DECK Ticket
        // title: conf.get<string>(`emailRefund.${locale}.title`),
        title: `emailRefund.${locale}.title`,
        // 返金のお知らせ
        // titleEmail: conf.get<string>(`emailRefund.${locale}.titleEmail`),
        titleEmail: `emailRefund.${locale}.titleEmail`,
        // トウキョウ タロウ 様
        // purchaserName: conf.get<string>(`emailRefund.${locale}.destinationName`).replace('$purchaser_name$', purchaserName),
        purchaserName: purchaserName,
        // 返金メールメッセージ
        messageInfos: messageInfos
    };
}
