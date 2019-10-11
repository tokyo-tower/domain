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

import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { MongoRepository as ReservationRepo } from '../repo/reservation';

import * as factory from '@tokyotower/factory';

const debug = createDebug('ttts-domain:service');

export type ICompoundPriceSpecification = factory.chevre.compoundPriceSpecification.IPriceSpecification<any>;

/**
 * クレジットカード返金処理を実行する
 */
export function refundCreditCard(params: factory.cinerino.task.IData<factory.cinerino.taskName.RefundCreditCard>) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: cinerino.repository.Action;
        order: cinerino.repository.Order;
        project: cinerino.repository.Project;
        seller: cinerino.repository.Seller;
        task: cinerino.repository.Task;
        transaction: cinerino.repository.Transaction;
    }) => {
        const projectDetails = await repos.project.findById({ id: params.project.id });
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (projectDetails.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (projectDetails.settings.gmo === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        // const seller = await repos.seller.findById({
        //     id: params.object.purpose.seller.id
        // });

        // const { shopId, shopPass } = getGMOInfoFromSeller({ seller: seller });

        const refundActionAttributes = params;
        const payAction = refundActionAttributes.object;
        const simpleOrder = refundActionAttributes.purpose;

        const returnOrderTransactions = await repos.transaction.search<factory.transactionType.ReturnOrder>({
            limit: 1,
            typeOf: factory.transactionType.ReturnOrder,
            object: { order: { orderNumbers: [simpleOrder.orderNumber] } }
        });
        const returnOrderTransaction = returnOrderTransactions.shift();
        if (returnOrderTransaction === undefined) {
            throw new factory.errors.NotFound('ReturnOrderTransaction');
        }

        const order = await repos.order.findByOrderNumber({
            orderNumber: simpleOrder.orderNumber
        });

        const action = await repos.action.start(refundActionAttributes);
        const alterTranResult: GMO.services.credit.IAlterTranResult[] = [];

        try {
            const creditCardService = new GMO.service.Credit({ endpoint: projectDetails.settings.gmo.endpoint });
            await Promise.all(payAction.object.map(async (paymentMethod) => {
                const entryTranArgs = paymentMethod.entryTranArgs;

                // 取引状態参照
                const searchTradeResult = await creditCardService.searchTrade({
                    shopId: entryTranArgs.shopId,
                    shopPass: entryTranArgs.shopPass,
                    orderId: entryTranArgs.orderId
                });
                debug('searchTradeResult is', searchTradeResult);

                let creditCardSalesBefore: GMO.services.credit.IAlterTranResult | undefined;
                if (payAction !== undefined && payAction.result !== undefined && payAction.result.creditCardSales !== undefined) {
                    creditCardSalesBefore = payAction.result.creditCardSales[0];
                }
                if (creditCardSalesBefore === undefined) {
                    throw new Error('Credit Card Sales not found');
                }

                // GMO取引状態に変更がなければ金額変更
                debug('trade already changed?', (searchTradeResult.tranId !== creditCardSalesBefore.tranId));
                if (searchTradeResult.tranId === creditCardSalesBefore.tranId) {
                    // 手数料0円であれば、決済取り消し(返品)処理
                    if (returnOrderTransaction.object.cancellationFee === 0) {
                        alterTranResult.push(await GMO.services.credit.alterTran({
                            shopId: entryTranArgs.shopId,
                            shopPass: entryTranArgs.shopPass,
                            accessId: searchTradeResult.accessId,
                            accessPass: searchTradeResult.accessPass,
                            jobCd: GMO.utils.util.JobCd.Return
                        }));
                    } else {
                        const changeTranResult = await GMO.services.credit.changeTran({
                            shopId: entryTranArgs.shopId,
                            shopPass: entryTranArgs.shopPass,
                            accessId: searchTradeResult.accessId,
                            accessPass: searchTradeResult.accessPass,
                            jobCd: GMO.utils.util.JobCd.Capture,
                            amount: returnOrderTransaction.object.cancellationFee
                        });
                        alterTranResult.push(changeTranResult);
                    }
                }
            }));
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        // アクション完了
        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: { alterTranResult } });

        await onRefund(refundActionAttributes, order)({ task: repos.task });
    };
}

/**
 * 返金後のアクション
 */
function onRefund(
    refundActionAttributes: factory.cinerino.action.trade.refund.IAttributes<factory.paymentMethodType>,
    order: factory.order.IOrder
) {
    return async (repos: { task: cinerino.repository.Task }) => {
        const potentialActions = refundActionAttributes.potentialActions;
        const now = new Date();
        const taskAttributes: factory.task.IAttributes<factory.taskName>[] = [];
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (potentialActions !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(potentialActions.sendEmailMessage)) {
                potentialActions.sendEmailMessage.forEach((s) => {
                    const sendEmailMessageTask: factory.cinerino.task.IAttributes<factory.cinerino.taskName.SendEmailMessage> = {
                        project: s.project,
                        name: factory.cinerino.taskName.SendEmailMessage,
                        status: factory.taskStatus.Ready,
                        runsAt: now, // なるはやで実行
                        remainingNumberOfTries: 3,
                        numberOfTried: 0,
                        executionResults: [],
                        data: {
                            actionAttributes: s
                        }
                    };
                    taskAttributes.push(sendEmailMessageTask);
                });
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(potentialActions.informOrder)) {
                taskAttributes.push(...potentialActions.informOrder.map(
                    (a: any): factory.task.IAttributes<factory.cinerino.taskName.TriggerWebhook> => {
                        return {
                            project: a.project,
                            name: factory.cinerino.taskName.TriggerWebhook,
                            status: factory.taskStatus.Ready,
                            runsAt: now, // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                ...a,
                                object: order
                            }
                        };
                    })
                );
            }
        }

        // タスク保管
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save<any>(taskAttribute);
        }));
    };
}

export function processReturnAllByPerformance(
    agentId: string,
    performanceId: string,
    clientIds: string[],
    potentialActions?: factory.cinerino.transaction.returnOrder.IPotentialActionsParams
) {
    // tslint:disable-next-line:max-func-body-length
    return async (
        actionRepo: cinerino.repository.Action,
        invoiceRepo: cinerino.repository.Invoice,
        performanceRepo: PerformanceRepo,
        projectRepo: cinerino.repository.Project,
        orderRepo: cinerino.repository.Order,
        reservationRepo: ReservationRepo,
        sellerRepo: cinerino.repository.Seller,
        transactionRepo: cinerino.repository.Transaction
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

        // 返品取引進行(実際の返品処理は非同期で実行される)
        // tslint:disable-next-line:max-func-body-length
        await Promise.all(transactionIds.map(async (transactionId) => {
            const placeOrderTransaction = await transactionRepo.findById({
                typeOf: factory.transactionType.PlaceOrder,
                id: transactionId
            });

            if (placeOrderTransaction.result !== undefined) {
                // 返品メール作成
                const emailCustomization = await createEmailMessage4sellerReason(placeOrderTransaction);

                const order = placeOrderTransaction.result.order;

                // クレジットカード返金アクション
                const actionsOnOrder = await actionRepo.searchByOrderNumber({ orderNumber: order.orderNumber });
                const payActions = <factory.cinerino.action.trade.pay.IAction<factory.paymentMethodType>[]>actionsOnOrder
                    .filter((a) => a.typeOf === factory.actionType.PayAction)
                    .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus);

                const refundCreditCardActionsParams: factory.cinerino.transaction.returnOrder.IRefundCreditCardParams[] =
                    await Promise.all((<factory.cinerino.action.trade.pay.IAction<factory.paymentMethodType.CreditCard>[]>payActions)
                        .filter((a) => a.object[0].paymentMethod.typeOf === factory.paymentMethodType.CreditCard)
                        // tslint:disable-next-line:max-line-length
                        .map(async (a) => {
                            return {
                                object: {
                                    object: a.object.map((o) => {
                                        return {
                                            paymentMethod: {
                                                paymentMethodId: o.paymentMethod.paymentMethodId
                                            }
                                        };
                                    })
                                },
                                potentialActions: {
                                    sendEmailMessage: {
                                        object: {
                                            sender: emailCustomization.sender,
                                            toRecipient: emailCustomization.toRecipient,
                                            about: emailCustomization.about,
                                            // template: emailCustomization.text,
                                            text: emailCustomization.text
                                        }
                                    },
                                    informOrder: (potentialActions !== undefined
                                        && potentialActions.returnOrder !== undefined
                                        && potentialActions.returnOrder.potentialActions !== undefined
                                        && Array.isArray(potentialActions.returnOrder.potentialActions.informOrder))
                                        ? potentialActions.returnOrder.potentialActions.informOrder
                                        : []
                                }
                            };
                        }));

                const expires = moment()
                    .add(1, 'minute')
                    .toDate();

                const potentialActionParams: factory.transaction.returnOrder.IPotentialActionsParams = {
                    returnOrder: {
                        potentialActions: {
                            refundCreditCard: refundCreditCardActionsParams,
                            cancelReservation: (potentialActions !== undefined
                                && potentialActions.returnOrder !== undefined
                                && potentialActions.returnOrder.potentialActions !== undefined
                                && Array.isArray(potentialActions.returnOrder.potentialActions.cancelReservation))
                                ? potentialActions.returnOrder.potentialActions.cancelReservation
                                : []
                        }
                    }
                };

                // 注文返品取引開始
                const returnOrderTransaction = await cinerino.service.transaction.returnOrder4ttts.start({
                    project: placeOrderTransaction.project,
                    agent: { typeOf: factory.personType.Person, id: agentId },
                    expires: expires,
                    object: {
                        cancellationFee: 0,
                        order: { orderNumber: order.orderNumber },
                        reason: factory.transaction.returnOrder.Reason.Seller
                    },
                    seller: { typeOf: order.seller.typeOf, id: order.seller.id }
                })({
                    action: actionRepo,
                    invoice: invoiceRepo,
                    order: orderRepo,
                    project: projectRepo,
                    seller: sellerRepo,
                    transaction: transactionRepo
                });

                // 取引確定
                await cinerino.service.transaction.returnOrder4ttts.confirm({
                    id: returnOrderTransaction.id,
                    potentialActions: potentialActionParams
                })({
                    action: actionRepo,
                    seller: sellerRepo,
                    transaction: transactionRepo
                });
            }
        }));
    };
}

function getUnitPriceByAcceptedOffer(offer: factory.order.IAcceptedOffer<any>) {
    let unitPrice: number = 0;

    if (offer.priceSpecification !== undefined) {
        const priceSpecification = <ICompoundPriceSpecification>offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceSpec = priceSpecification.priceComponent.find(
                (c) => c.typeOf === factory.chevre.priceSpecificationType.UnitPriceSpecification
            );
            if (unitPriceSpec !== undefined && unitPriceSpec.price !== undefined && Number.isInteger(unitPriceSpec.price)) {
                unitPrice = unitPriceSpec.price;
            }
        }
    } else if (offer.price !== undefined && Number.isInteger(offer.price)) {
        unitPrice = offer.price;
    }

    return unitPrice;
}

/**
 * 販売者都合での返品メール作成
 */
async function createEmailMessage4sellerReason(
    placeOrderTransaction: factory.transaction.placeOrder.ITransaction
): Promise<factory.creativeWork.message.email.IAttributes> {
    const transactionResult = <factory.transaction.placeOrder.IResult>placeOrderTransaction.result;
    const order = transactionResult.order;
    const reservation = <factory.cinerino.order.IReservation>order.acceptedOffers[0].itemOffered;

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
    order.acceptedOffers.forEach((o) => {
        const r = <factory.cinerino.order.IReservation>o.itemOffered;
        const unitPrice = getUnitPriceByAcceptedOffer(o);

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
        amount: numeral(order.price).format('0,0'),
        numberOfReservations: order.acceptedOffers.length,
        ticketInfoJa,
        ticketInfoEn
    });

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
