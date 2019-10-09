/**
 * 注文返品サービス
 */
import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import * as emailMessageBuilder from '../../emailMessageBuilder';

const debug = createDebug('ttts-domain:service');

const CANCELLABLE_DAYS = 3;

export type IConfirmOperation<T> = (repos: {
    action: cinerino.repository.Action;
    invoice: cinerino.repository.Invoice;
    seller: cinerino.repository.Seller;
    transaction: cinerino.repository.Transaction;
}) => Promise<T>;
export type ITaskAndTransactionOperation<T> = (
    taskRepo: cinerino.repository.Task, transactionRepo: cinerino.repository.Transaction
) => Promise<T>;
export type WebAPIIdentifier = factory.cinerino.service.webAPI.Identifier;

/**
 * 予約キャンセル処理
 */
// tslint:disable-next-line:max-func-body-length
export function confirm(params: {
    project: factory.project.IProject;
    /**
     * 主体者ID
     */
    agentId: string;
    /**
     * APIクライアント
     */
    clientUser: factory.clientUser.IClientUser;
    /**
     * 取引ID
     */
    transactionId: string;
    /**
     * キャンセル手数料
     */
    cancellationFee: number;
    /**
     * 強制的に返品するかどうか
     * 管理者の判断で返品する場合、バリデーションをかけない
     */
    forcibly: boolean;
    /**
     * 返品理由
     */
    reason: factory.transaction.returnOrder.Reason;
    /**
     * 取引確定後アクション
     */
    potentialActions?: factory.cinerino.transaction.returnOrder.IPotentialActionsParams;
}): IConfirmOperation<factory.transaction.returnOrder.ITransaction> {
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    return async (repos: {
        action: cinerino.repository.Action;
        invoice: cinerino.repository.Invoice;
        seller: cinerino.repository.Seller;
        transaction: cinerino.repository.Transaction;
    }) => {
        const now = new Date();

        // 返品対象の取引取得
        const transaction = await repos.transaction.transactionModel.findOne(
            {
                typeOf: factory.transactionType.PlaceOrder,
                status: factory.transactionStatusType.Confirmed,
                _id: params.transactionId
            }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('transaction');
            }

            return <factory.transaction.placeOrder.ITransaction>doc.toObject();
        });

        const transactionResult = <factory.transaction.placeOrder.IResult>transaction.result;
        const order = transactionResult.order;
        const seller = await repos.seller.findById(
            { id: order.seller.id },
            { paymentAccepted: 0 } // 決済情報は不要
        );

        // 決済がある場合、請求書の状態を検証
        if (order.paymentMethods.length > 0) {
            const invoices = await repos.invoice.search({ referencesOrder: { orderNumbers: [order.orderNumber] } });
            const allPaymentCompleted = invoices.every(
                (invoice) => invoice.paymentStatus === factory.cinerino.paymentStatusType.PaymentComplete
            );
            if (!allPaymentCompleted) {
                throw new factory.errors.Argument('order.orderNumber', 'Payment not completed');
            }
        }

        // 検証
        if (!params.forcibly) {
            validateRequest(now, (<factory.cinerino.order.IReservation>order.acceptedOffers[0].itemOffered).reservationFor.startDate);
        }

        const endDate = new Date();
        const cancelName = `${order.customer.familyName} ${order.customer.givenName}`;

        const actionsOnOrder = await repos.action.searchByOrderNumber({ orderNumber: order.orderNumber });
        const payActions = <factory.cinerino.action.trade.pay.IAction<factory.paymentMethodType>[]>actionsOnOrder
            .filter((a) => a.typeOf === factory.actionType.PayAction)
            .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus);

        // クレジットカード返金アクション
        const refundCreditCardActions =
            await Promise.all((<factory.cinerino.action.trade.pay.IAction<factory.paymentMethodType.CreditCard>[]>payActions)
                .filter((a) => a.object[0].paymentMethod.typeOf === factory.paymentMethodType.CreditCard)
                // tslint:disable-next-line:max-func-body-length
                .map(async (a): Promise<factory.cinerino.action.trade.refund.IAttributes<factory.paymentMethodType.CreditCard>> => {
                    const informOrderActionsOnRefund: factory.cinerino.action.interact.inform.IAttributes<any, any>[] = [];
                    // Eメールカスタマイズの指定を確認
                    let emailCustomization: factory.creativeWork.message.email.ICustomization | undefined;

                    const refundCreditCardActionParams = (params.potentialActions !== undefined
                        && params.potentialActions.returnOrder !== undefined
                        && params.potentialActions.returnOrder.potentialActions !== undefined
                        && params.potentialActions.returnOrder.potentialActions.refundCreditCard !== undefined)
                        ? params.potentialActions.returnOrder.potentialActions.refundCreditCard
                        : undefined;
                    if (refundCreditCardActionParams !== undefined) {
                        const assignedRefundCreditCardAction = refundCreditCardActionParams.find((refundCreditCardAction) => {
                            const assignedPaymentMethod = refundCreditCardAction.object.object.find((paymentMethod) => {
                                return paymentMethod.paymentMethod.paymentMethodId === a.object[0].paymentMethod.paymentMethodId;
                            });

                            return assignedPaymentMethod !== undefined;
                        });

                        if (assignedRefundCreditCardAction !== undefined
                            && assignedRefundCreditCardAction.potentialActions !== undefined
                            && assignedRefundCreditCardAction.potentialActions.sendEmailMessage !== undefined
                            && assignedRefundCreditCardAction.potentialActions.sendEmailMessage.object !== undefined) {
                            emailCustomization = assignedRefundCreditCardAction.potentialActions.sendEmailMessage.object;
                        }

                        if (assignedRefundCreditCardAction !== undefined
                            && assignedRefundCreditCardAction.potentialActions !== undefined
                            && Array.isArray(assignedRefundCreditCardAction.potentialActions.informOrder)) {
                            assignedRefundCreditCardAction.potentialActions.informOrder.forEach((informOrderParams) => {
                                if (informOrderParams.recipient !== undefined) {
                                    if (typeof informOrderParams.recipient.url === 'string') {
                                        informOrderActionsOnRefund.push({
                                            agent: transaction.seller,
                                            object: order,
                                            project: transaction.project,
                                            // purpose: params.transaction,
                                            recipient: {
                                                id: transaction.agent.id,
                                                name: transaction.agent.name,
                                                typeOf: transaction.agent.typeOf,
                                                url: informOrderParams.recipient.url
                                            },
                                            typeOf: factory.actionType.InformAction
                                        });
                                    }
                                }
                            });
                        }
                    }
                    debug('emailCustomization:', emailCustomization);

                    const emailMessage = await emailMessageBuilder.createRefundMessage({
                        order,
                        paymentMethods: a.object.map((o) => o.paymentMethod),
                        email: emailCustomization
                    });
                    const sendEmailMessageActionAttributes: factory.cinerino.action.transfer.send.message.email.IAttributes = {
                        project: transaction.project,
                        typeOf: factory.actionType.SendAction,
                        object: {
                            ...emailMessage,
                            ...(emailCustomization !== undefined && typeof (<any>emailCustomization).text === 'string')
                                ? { text: (<any>emailCustomization).text }
                                : undefined
                        },
                        agent: {
                            project: transaction.project,
                            typeOf: seller.typeOf,
                            id: seller.id,
                            name: seller.name,
                            url: seller.url
                        },
                        recipient: order.customer,
                        potentialActions: {},
                        purpose: {
                            typeOf: order.typeOf,
                            seller: order.seller,
                            customer: order.customer,
                            confirmationNumber: order.confirmationNumber,
                            orderNumber: order.orderNumber,
                            price: order.price,
                            priceCurrency: order.priceCurrency,
                            orderDate: order.orderDate
                        }
                    };

                    return {
                        project: transaction.project,
                        typeOf: <factory.actionType.RefundAction>factory.actionType.RefundAction,
                        object: a,
                        agent: {
                            project: transaction.project,
                            typeOf: seller.typeOf,
                            id: seller.id,
                            name: seller.name,
                            url: seller.url
                        },
                        recipient: order.customer,
                        purpose: {
                            project: transaction.project,
                            typeOf: order.typeOf,
                            seller: order.seller,
                            customer: order.customer,
                            confirmationNumber: order.confirmationNumber,
                            orderNumber: order.orderNumber,
                            price: order.price,
                            priceCurrency: order.priceCurrency,
                            orderDate: order.orderDate
                        },
                        potentialActions: {
                            informOrder: informOrderActionsOnRefund,
                            sendEmailMessage: (emailCustomization !== undefined)
                                ? [sendEmailMessageActionAttributes]
                                : []
                        }
                    };
                }));

        const cancelReservationActions: factory.cinerino.task.IData<factory.cinerino.taskName.CancelReservation>[] = [];

        let cancelReservationParams: factory.cinerino.transaction.returnOrder.ICancelReservationParams[] = [];
        if (params.potentialActions !== undefined
            && params.potentialActions.returnOrder !== undefined
            && params.potentialActions.returnOrder.potentialActions !== undefined
            && Array.isArray(params.potentialActions.returnOrder.potentialActions.cancelReservation)) {
            cancelReservationParams = params.potentialActions.returnOrder.potentialActions.cancelReservation;
        }

        const authorizeSeatReservationActions = <factory.cinerino.action.authorize.offer.seatReservation.IAction<WebAPIIdentifier>[]>
            transaction.object.authorizeActions
                .filter((a) => a.object.typeOf === factory.cinerino.action.authorize.offer.seatReservation.ObjectType.SeatReservation)
                .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus);

        for (const authorizeSeatReservationAction of authorizeSeatReservationActions) {
            if (authorizeSeatReservationAction.result === undefined) {
                throw new factory.errors.NotFound('Result of seat reservation authorize action');
            }

            const responseBody = authorizeSeatReservationAction.result.responseBody;

            if (authorizeSeatReservationAction.instrument === undefined) {
                authorizeSeatReservationAction.instrument = {
                    typeOf: 'WebAPI',
                    identifier: factory.cinerino.service.webAPI.Identifier.Chevre
                };
            }

            switch (authorizeSeatReservationAction.instrument.identifier) {
                default:
                    // tslint:disable-next-line:max-line-length
                    const reserveTransaction = <factory.cinerino.action.authorize.offer.seatReservation.IResponseBody<factory.cinerino.service.webAPI.Identifier.Chevre>>responseBody;

                    const cancelReservationAction: factory.cinerino.task.IData<factory.cinerino.taskName.CancelReservation> = {
                        project: transaction.project,
                        typeOf: factory.actionType.CancelAction,
                        object: reserveTransaction,
                        agent: transaction.agent,
                        potentialActions: {},
                        purpose: {
                            typeOf: order.typeOf,
                            seller: order.seller,
                            customer: order.customer,
                            confirmationNumber: order.confirmationNumber,
                            orderNumber: order.orderNumber,
                            price: order.price,
                            priceCurrency: order.priceCurrency,
                            orderDate: order.orderDate
                        },
                        instrument: authorizeSeatReservationAction.instrument
                    };

                    const cancelReservationObjectParams = cancelReservationParams.find((p) => {
                        // tslint:disable-next-line:max-line-length
                        const object = <factory.cinerino.transaction.returnOrder.ICancelReservationObject<factory.cinerino.service.webAPI.Identifier.Chevre>>
                            p.object;

                        return object === undefined
                            || (object !== undefined
                                && object.typeOf === factory.chevre.transactionType.Reserve
                                && object.id === reserveTransaction.id);
                    });

                    if (cancelReservationObjectParams !== undefined) {
                        // 予約取消確定後アクションの指定があれば上書き
                        if (cancelReservationObjectParams.potentialActions !== undefined
                            && cancelReservationObjectParams.potentialActions.cancelReservation !== undefined
                            && cancelReservationObjectParams.potentialActions.cancelReservation.potentialActions !== undefined
                            && Array.isArray(
                                cancelReservationObjectParams.potentialActions.cancelReservation.potentialActions.informReservation
                            )) {
                            cancelReservationAction.potentialActions = {
                                cancelReservation: {
                                    potentialActions: {
                                        // tslint:disable-next-line:max-line-length
                                        informReservation: cancelReservationObjectParams.potentialActions.cancelReservation.potentialActions.informReservation
                                    }
                                }
                            };
                        }
                    }

                    cancelReservationActions.push(cancelReservationAction);
            }
        }

        const informOrderActionsOnReturn: factory.cinerino.action.interact.inform.IAttributes<any, any>[] = [];
        if (params.potentialActions !== undefined) {
            if (params.potentialActions.returnOrder !== undefined) {
                if (params.potentialActions.returnOrder.potentialActions !== undefined) {
                    if (Array.isArray(params.potentialActions.returnOrder.potentialActions.informOrder)) {
                        params.potentialActions.returnOrder.potentialActions.informOrder.forEach((a) => {
                            if (a.recipient !== undefined) {
                                if (typeof a.recipient.url === 'string') {
                                    informOrderActionsOnReturn.push({
                                        agent: transaction.seller,
                                        object: order,
                                        project: transaction.project,
                                        // purpose: params.transaction,
                                        recipient: {
                                            id: transaction.agent.id,
                                            name: transaction.agent.name,
                                            typeOf: transaction.agent.typeOf,
                                            url: a.recipient.url
                                        },
                                        typeOf: factory.actionType.InformAction
                                    });
                                }
                            }
                        });
                    }
                }
            }
        }

        const returnOrderActionAttributes: factory.cinerino.action.transfer.returnAction.order.IAttributes = {
            project: params.project,
            typeOf: factory.actionType.ReturnAction,
            object: {
                project: params.project,
                typeOf: order.typeOf,
                seller: order.seller,
                customer: order.customer,
                confirmationNumber: order.confirmationNumber,
                orderNumber: order.orderNumber,
                price: order.price,
                priceCurrency: order.priceCurrency,
                orderDate: order.orderDate
            },
            agent: order.customer,
            recipient: transaction.seller,
            potentialActions: {
                cancelReservation: cancelReservationActions,
                informOrder: informOrderActionsOnReturn,
                refundCreditCard: refundCreditCardActions,
                refundAccount: [],
                refundMovieTicket: [],
                returnPointAward: []
            }
        };
        const result: factory.transaction.returnOrder.IResult = {
        };
        const potentialActions: factory.cinerino.transaction.returnOrder.IPotentialActions = {
            returnOrder: returnOrderActionAttributes
        };

        const returnOrderAttributes: factory.transaction.returnOrder.IAttributes = {
            project: params.project,
            typeOf: factory.transactionType.ReturnOrder,
            status: factory.transactionStatusType.Confirmed,
            agent: {
                typeOf: factory.personType.Person,
                id: params.agentId
            },
            seller: transaction.seller,
            result: result,
            object: {
                clientUser: params.clientUser,
                order: order,
                transaction: transaction,
                cancelName: cancelName,
                cancellationFee: params.cancellationFee,
                reason: params.reason
            },
            expires: endDate,
            startDate: now,
            endDate: endDate,
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported,
            potentialActions: potentialActions
        };

        let returnOrderTransaction: factory.transaction.returnOrder.ITransaction;
        try {
            returnOrderTransaction = await repos.transaction.transactionModel.create(returnOrderAttributes)
                .then((doc) => doc.toObject());
        } catch (error) {
            if (error.name === 'MongoError') {
                // 同一取引に対して返品取引を作成しようとすると、MongoDBでE11000 duplicate key errorが発生する
                // name: 'MongoError',
                // message: 'E11000 duplicate key error ...',
                // code: 11000,

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                // tslint:disable-next-line:no-magic-numbers
                if (error.code === 11000) {
                    throw new factory.errors.AlreadyInUse('transaction', ['object.transaction'], 'Already returned.');
                }
            }

            throw error;
        }

        return returnOrderTransaction;
    };
}

/**
 * キャンセル検証
 */
function validateRequest(now: Date, performanceStartDate: Date) {
    // 入塔予定日の3日前までキャンセル可能(3日前を過ぎていたらエラー)
    const cancellableThrough = moment(performanceStartDate).add(-CANCELLABLE_DAYS + 1, 'days').toDate();
    if (cancellableThrough <= now) {
        throw new factory.errors.Argument('performance_day', 'キャンセルできる期限を過ぎています。');
    }
}

/**
 * 確定取引についてメールを送信する
 */
export function sendEmail(
    transactionId: string,
    emailMessageAttributes: factory.creativeWork.message.email.IAttributes
): ITaskAndTransactionOperation<factory.cinerino.task.ITask<factory.cinerino.taskName.SendEmailMessage>> {
    return async (taskRepo: cinerino.repository.Task, transactionRepo: cinerino.repository.Transaction) => {
        const returnOrderTransaction: factory.transaction.returnOrder.ITransaction = <any>
            await transactionRepo.findById({ typeOf: factory.transactionType.ReturnOrder, id: transactionId });
        if (returnOrderTransaction.status !== factory.transactionStatusType.Confirmed) {
            throw new factory.errors.Forbidden('Transaction not confirmed.');
        }

        const placeOrderTransaction = returnOrderTransaction.object.transaction;
        if (placeOrderTransaction.result === undefined) {
            throw new factory.errors.NotFound('PlaceOrder Transaction Result');
        }
        const order = placeOrderTransaction.result.order;

        const emailMessage: factory.creativeWork.message.email.ICreativeWork = {
            typeOf: factory.creativeWorkType.EmailMessage,
            identifier: `returnOrderTransaction-${transactionId}`,
            name: `returnOrderTransaction-${transactionId}`,
            sender: {
                typeOf: placeOrderTransaction.seller.typeOf,
                name: emailMessageAttributes.sender.name,
                email: emailMessageAttributes.sender.email
            },
            toRecipient: {
                typeOf: placeOrderTransaction.agent.typeOf,
                name: emailMessageAttributes.toRecipient.name,
                email: emailMessageAttributes.toRecipient.email
            },
            about: emailMessageAttributes.about,
            text: emailMessageAttributes.text
        };

        // その場で送信ではなく、DBにタスクを登録
        const taskAttributes: factory.cinerino.task.IAttributes<factory.cinerino.taskName.SendEmailMessage> = {
            name: factory.cinerino.taskName.SendEmailMessage,
            project: returnOrderTransaction.project,
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            numberOfTried: 0,
            executionResults: [],
            data: {
                actionAttributes: {
                    agent: {
                        id: order.seller.id,
                        name: { ja: order.seller.name, en: '' },
                        project: returnOrderTransaction.project,
                        typeOf: order.seller.typeOf
                    },
                    object: emailMessage,
                    project: returnOrderTransaction.project,
                    purpose: {
                        typeOf: order.typeOf,
                        orderNumber: order.orderNumber
                    },
                    recipient: {
                        id: order.customer.id,
                        name: order.customer.name,
                        typeOf: order.customer.typeOf
                    },
                    typeOf: factory.cinerino.actionType.SendAction
                }
                // transactionId: transactionId,
                // emailMessage: emailMessage
            }
        };

        return <any>await taskRepo.save(taskAttributes);
    };
}

/**
 * 返品取引のタスクをエクスポートする
 */
export async function exportTasks(status: factory.transactionStatusType) {
    const transactionRepo = new cinerino.repository.Transaction(mongoose.connection);

    const statusesTasksExportable = [factory.transactionStatusType.Expired, factory.transactionStatusType.Confirmed];
    if (statusesTasksExportable.indexOf(status) < 0) {
        throw new factory.errors.Argument('status', `transaction status should be in [${statusesTasksExportable.join(',')}]`);
    }

    const transaction = await transactionRepo.transactionModel.findOneAndUpdate(
        {
            typeOf: factory.transactionType.ReturnOrder,
            status: status,
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        },
        { tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting },
        { new: true }
    ).exec()
        .then((doc) => (doc === null) ? null : <factory.transaction.returnOrder.ITransaction>doc.toObject());

    if (transaction === null) {
        return;
    }

    // 失敗してもここでは戻さない(RUNNINGのまま待機)
    await exportTasksById(transaction.id);

    await transactionRepo.setTasksExportedById({ id: transaction.id });
}

export async function exportTasksById(transactionId: string): Promise<factory.task.ITask<any>[]> {
    const transactionRepo = new cinerino.repository.Transaction(mongoose.connection);
    const taskRepo = new cinerino.repository.Task(mongoose.connection);

    const transaction: factory.transaction.returnOrder.ITransaction = <any>
        await transactionRepo.findById({ typeOf: factory.transactionType.ReturnOrder, id: transactionId });

    const taskAttributes: factory.cinerino.task.IAttributes<factory.cinerino.taskName>[] = [];
    switch (transaction.status) {
        case factory.transactionStatusType.Confirmed:
            taskAttributes.push({
                name: factory.cinerino.taskName.ReturnOrder,
                project: transaction.project,
                status: factory.taskStatus.Ready,
                runsAt: new Date(), // なるはやで実行
                remainingNumberOfTries: 10,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    project: transaction.project,
                    orderNumber: transaction.object.order.orderNumber
                }
            });

            break;

        case factory.transactionStatusType.Expired:

            break;

        default:
            throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
    }

    return Promise.all(taskAttributes.map<any>(async (taskAttribute) => {
        return taskRepo.save(<any>taskAttribute);
    }));
}
