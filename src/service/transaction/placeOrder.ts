/**
 * 注文取引サービス
 */
import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';

import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('ttts-domain:service');

export type ITaskAndTransactionOperation<T> = (taskRepository: cinerino.repository.Task, transactionRepo: TransactionRepo) => Promise<T>;

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(status: factory.transactionStatusType): ITaskAndTransactionOperation<void> {
    return async (taskRepository: cinerino.repository.Task, transactionRepo: TransactionRepo) => {
        const statusesTasksExportable = [factory.transactionStatusType.Expired, factory.transactionStatusType.Confirmed];
        if (statusesTasksExportable.indexOf(status) < 0) {
            throw new factory.errors.Argument('status', `transaction status should be in [${statusesTasksExportable.join(',')}]`);
        }

        const transaction = await transactionRepo.transactionModel.findOneAndUpdate(
            {
                typeOf: factory.transactionType.PlaceOrder,
                status: status,
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            },
            { tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting },
            { new: true }
        ).exec()
            .then((doc) => (doc === null) ? null : <factory.transaction.placeOrder.ITransaction>doc.toObject());

        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById(transaction.id)(taskRepository, transactionRepo);

        await transactionRepo.setTasksExportedById({ id: transaction.id });
    };
}

export function exportTasksById(transactionId: string): ITaskAndTransactionOperation<factory.task.ITask<any>[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (taskRepository: cinerino.repository.Task, transactionRepo: TransactionRepo) => {
        const transaction = <any>await transactionRepo.findById({ typeOf: factory.transactionType.PlaceOrder, id: transactionId });

        const taskAttributes: factory.task.IAttributes<any>[] = [];

        // ウェブフックタスクを追加
        const webhookUrl =
            // tslint:disable-next-line:max-line-length
            `${process.env.TELEMETRY_API_ENDPOINT}/organizations/project/${process.env.PROJECT_ID}/tasks/analyzePlaceOrder`;
        const triggerWebhookTaskAttributes: factory.cinerino.task.IAttributes<factory.cinerino.taskName.TriggerWebhook> = {
            name: factory.cinerino.taskName.TriggerWebhook,
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: {
                url: webhookUrl,
                payload: { transaction: transaction }
            }
        };
        taskAttributes.push(
            triggerWebhookTaskAttributes
        );

        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                taskAttributes.push({
                    name: <any>factory.taskName.SettleSeatReservation,
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id
                    }
                });

                const potentialActions = transaction.potentialActions;
                if (potentialActions !== undefined) {
                    const orderActionAttributes = potentialActions.order;
                    const placeOrderTaskAttributes: factory.cinerino.task.IAttributes<factory.cinerino.taskName.PlaceOrder> = {
                        project: transaction.project,
                        name: factory.cinerino.taskName.PlaceOrder,
                        status: factory.taskStatus.Ready,
                        runsAt: new Date(), // なるはやで実行
                        remainingNumberOfTries: 10,
                        numberOfTried: 0,
                        executionResults: [],
                        data: orderActionAttributes
                    };
                    taskAttributes.push(<any>placeOrderTaskAttributes);
                }

                taskAttributes.push({
                    name: <any>factory.taskName.CreatePlaceOrderReport,
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transaction: transaction
                    }
                });

                break;

            // 期限切れの場合は、タスクリストを作成する
            case factory.transactionStatusType.Expired:
                taskAttributes.push({
                    name: <any>factory.taskName.CancelSeatReservation,
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id
                    }
                });
                taskAttributes.push({
                    name: <any>factory.cinerino.taskName.CancelCreditCard,
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

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }
        debug('taskAttributes prepared', taskAttributes);

        return Promise.all(taskAttributes.map<any>(async (taskAttribute) => {
            return taskRepository.save(<any>taskAttribute);
        }));
    };
}

/**
 * 確定取引についてメールを送信する
 * @param transactionId 取引ID
 * @param emailMessageAttributes Eメールメッセージ属性
 */
export function sendEmail(
    transactionId: string,
    emailMessageAttributes: factory.creativeWork.message.email.IAttributes
): ITaskAndTransactionOperation<factory.task.sendEmailNotification.ITask> {
    return async (taskRepo: cinerino.repository.Task, transactionRepo: TransactionRepo) => {
        const transaction = await transactionRepo.findById({ typeOf: factory.transactionType.PlaceOrder, id: transactionId });
        if (transaction.status !== factory.transactionStatusType.Confirmed) {
            throw new factory.errors.Forbidden('Transaction not confirmed.');
        }

        const emailMessage = {
            typeOf: <factory.creativeWorkType.EmailMessage>factory.creativeWorkType.EmailMessage,
            identifier: `placeOrderTransaction-${transactionId}`,
            name: `placeOrderTransaction-${transactionId}`,
            sender: {
                typeOf: transaction.seller.typeOf,
                name: emailMessageAttributes.sender.name,
                email: emailMessageAttributes.sender.email
            },
            toRecipient: {
                typeOf: transaction.agent.typeOf,
                name: emailMessageAttributes.toRecipient.name,
                email: emailMessageAttributes.toRecipient.email
            },
            about: emailMessageAttributes.about,
            text: emailMessageAttributes.text
        };

        // その場で送信ではなく、DBにタスクを登録
        const taskAttributes: factory.task.sendEmailNotification.IAttributes = {
            name: <any>factory.taskName.SendEmailNotification,
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            numberOfTried: 0,
            executionResults: [],
            data: {
                transactionId: transactionId,
                emailMessage: emailMessage
            }
        };

        return <any>await taskRepo.save(<any>taskAttributes);
    };
}
