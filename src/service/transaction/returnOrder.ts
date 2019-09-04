/**
 * 注文返品サービス
 */
import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const CANCELLABLE_DAYS = 3;

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

export type ITransactionOperation<T> = (repos: {
    invoice: cinerino.repository.Invoice;
    transaction: TransactionRepo;
}) => Promise<T>;
export type ITaskAndTransactionOperation<T> = (taskRepo: cinerino.repository.Task, transactionRepo: TransactionRepo) => Promise<T>;

/**
 * 予約キャンセル処理
 */
// tslint:disable-next-line:max-func-body-length
export function confirm(params: {
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
}): ITransactionOperation<factory.transaction.returnOrder.ITransaction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        invoice: cinerino.repository.Invoice;
        transaction: TransactionRepo;
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
            project: transaction.project,
            typeOf: factory.actionType.ReturnAction,
            object: {
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
                // cancelReservation: cancelReservationActions,
                informOrder: informOrderActionsOnReturn,
                refundCreditCard: [],
                refundAccount: [],
                refundMovieTicket: [],
                returnPointAward: []
            }
        };
        // const result: factory.transaction.returnOrder.IResult = {
        // };
        const potentialActions: factory.cinerino.transaction.returnOrder.IPotentialActions = {
            returnOrder: returnOrderActionAttributes
        };

        const returnOrderAttributes: factory.transaction.returnOrder.IAttributes = {
            project: project,
            typeOf: factory.transactionType.ReturnOrder,
            status: factory.transactionStatusType.Confirmed,
            agent: {
                typeOf: factory.personType.Person,
                id: params.agentId
            },
            seller: transaction.seller,
            result: {},
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
                .then((doc) => <factory.transaction.returnOrder.ITransaction>doc.toObject());
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
    return async (taskRepo: cinerino.repository.Task, transactionRepo: TransactionRepo) => {
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
                        typeOf: order.seller.typeOf
                    },
                    object: emailMessage,
                    recipient: {
                        id: order.customer.id,
                        name: order.customer.name,
                        typeOf: order.customer.typeOf
                    },
                    purpose: {
                        typeOf: order.typeOf,
                        orderNumber: order.orderNumber
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
    const transactionRepo = new TransactionRepo(mongoose.connection);

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
    const transactionRepo = new TransactionRepo(mongoose.connection);
    const taskRepo = new cinerino.repository.Task(mongoose.connection);

    const transaction: factory.transaction.returnOrder.ITransaction = <any>
        await transactionRepo.findById({ typeOf: factory.transactionType.ReturnOrder, id: transactionId });

    const taskAttributes: factory.task.IAttributes<any>[] = [];
    switch (transaction.status) {
        case factory.transactionStatusType.Confirmed:
            taskAttributes.push({
                name: <any>factory.taskName.ReturnOrder,
                status: factory.taskStatus.Ready,
                runsAt: new Date(), // なるはやで実行
                remainingNumberOfTries: 10,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    transactionId: transaction.id
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
