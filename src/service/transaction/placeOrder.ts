/**
 * placeOrder transaction service
 * 注文取引サービス
 * @namespace service.transaction.placeOrder
 */

import * as createDebug from 'debug';
import * as mongoose from 'mongoose';

import * as factory from '@motionpicture/ttts-factory';
import { MongoRepository as TaskRepository } from '../../repo/task';
import { MongoRepository as TransactionRepository } from '../../repo/transaction';

const debug = createDebug('ttts-domain:service:transaction:placeOrder');

export type ITaskAndTransactionOperation<T> = (taskRepository: TaskRepository, transactionRepository: TransactionRepository) => Promise<T>;

/**
 * ひとつの取引のタスクをエクスポートする
 */
export async function exportTasks(status: factory.transactionStatusType) {
    const transactionRepository = new TransactionRepository(mongoose.connection);

    const statusesTasksExportable = [factory.transactionStatusType.Expired, factory.transactionStatusType.Confirmed];
    if (statusesTasksExportable.indexOf(status) < 0) {
        throw new factory.errors.Argument('status', `transaction status should be in [${statusesTasksExportable.join(',')}]`);
    }

    const transaction = await transactionRepository.transactionModel.findOneAndUpdate(
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
    await exportTasksById(transaction.id);

    await transactionRepository.setTasksExportedById(transaction.id);
}

/**
 * ID指定で取引のタスク出力
 */
// tslint:disable-next-line:max-func-body-length
export async function exportTasksById(transactionId: string): Promise<factory.task.ITask[]> {
    const transactionRepository = new TransactionRepository(mongoose.connection);
    const taskRepository = new TaskRepository(mongoose.connection);

    const transaction = await transactionRepository.findPlaceOrderById(transactionId);

    const taskAttributes: factory.task.IAttributes[] = [];
    switch (transaction.status) {
        case factory.transactionStatusType.Confirmed:
            taskAttributes.push(factory.task.settleSeatReservation.createAttributes({
                status: factory.taskStatus.Ready,
                runsAt: new Date(), // なるはやで実行
                remainingNumberOfTries: 10,
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    transactionId: transaction.id
                }
            }));
            taskAttributes.push(factory.task.settleCreditCard.createAttributes({
                status: factory.taskStatus.Ready,
                runsAt: new Date(), // なるはやで実行
                remainingNumberOfTries: 10,
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    transactionId: transaction.id
                }
            }));

            break;

        // 期限切れの場合は、タスクリストを作成する
        case factory.transactionStatusType.Expired:
            taskAttributes.push(factory.task.cancelSeatReservation.createAttributes({
                status: factory.taskStatus.Ready,
                runsAt: new Date(), // なるはやで実行
                remainingNumberOfTries: 10,
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    transactionId: transaction.id
                }
            }));
            taskAttributes.push(factory.task.cancelCreditCard.createAttributes({
                status: factory.taskStatus.Ready,
                runsAt: new Date(), // なるはやで実行
                remainingNumberOfTries: 10,
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    transactionId: transaction.id
                }
            }));

            break;

        default:
            throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
    }
    debug('taskAttributes prepared', taskAttributes);

    return Promise.all(taskAttributes.map(async (taskAttribute) => {
        return taskRepository.save(taskAttribute);
    }));
}

/**
 * 確定取引についてメールを送信する
 * @export
 * @function
 * @memberof service.transaction.placeOrder
 * @param transactionId 取引ID
 * @param emailMessageAttributes Eメールメッセージ属性
 */
export function sendEmail(
    transactionId: string,
    emailMessageAttributes: factory.creativeWork.message.email.IAttributes
): ITaskAndTransactionOperation<factory.task.sendEmailNotification.ITask> {
    return async (taskRepo: TaskRepository, transactionRepo: TransactionRepository) => {
        const transaction = await transactionRepo.findPlaceOrderById(transactionId);
        if (transaction.status !== factory.transactionStatusType.Confirmed) {
            throw new factory.errors.Forbidden('Transaction not confirmed.');
        }

        const emailMessage = factory.creativeWork.message.email.create({
            identifier: `placeOrderTransaction-${transactionId}`,
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
        });

        // その場で送信ではなく、DBにタスクを登録
        const taskAttributes = factory.task.sendEmailNotification.createAttributes({
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: {
                transactionId: transactionId,
                emailMessage: emailMessage
            }
        });

        return <factory.task.sendEmailNotification.ITask>await taskRepo.save(taskAttributes);
    };
}

/**
 * 取引レポートインターフェース
 * @export
 * @interface
 * @memberof service.transaction.placeOrder
 */
export interface ITransactionReport {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    customer: {
        name: string;
        email: string;
        telephone: string;
        group: string;
    };
    eventStartDate: string;
    eventEndDate: string;
    reservedTickets: string;
    orderNumber: string;
    confirmationNumber: string;
    price: string;
    paymentMethod: string[];
    paymentMethodId: string[];
    discounts: string[];
    discountCodes: string[];
    discountPrices: string[];
}

export function transaction2report(transaction: factory.transaction.placeOrder.ITransaction): ITransactionReport {
    if (transaction.result !== undefined) {
        const order = transaction.result.order;
        const reservations = transaction.result.eventReservations.filter(
            (r) => r.status === factory.reservationStatusType.ReservationConfirmed
        );
        const ticketsStr = reservations.map(
            // tslint:disable-next-line:max-line-length
            (r) => `${r.seat_code} ${r.ticket_type_name.ja} ￥${r.ticket_type_charge} [${r.qr_str}]`
        ).join('\n');

        return {
            id: transaction.id,
            status: transaction.status,
            startDate: (transaction.startDate !== undefined) ? transaction.startDate.toISOString() : '',
            endDate: (transaction.endDate !== undefined) ? transaction.endDate.toISOString() : '',
            customer: {
                name: reservations[0].purchaser_name,
                email: reservations[0].purchaser_email,
                telephone: reservations[0].purchaser_tel,
                group: reservations[0].purchaser_group
            },
            eventStartDate: reservations[0].performance_start_date.toISOString(),
            eventEndDate: reservations[0].performance_end_date.toISOString(),
            reservedTickets: ticketsStr,
            orderNumber: order.orderNumber,
            confirmationNumber: order.confirmationNumber.toString(),
            price: `${order.price} ${order.priceCurrency}`,
            paymentMethod: order.paymentMethods.map((method) => method.name),
            paymentMethodId: order.paymentMethods.map((method) => method.paymentMethodId),
            discounts: order.discounts.map((discount) => discount.name),
            discountCodes: order.discounts.map((discount) => discount.discountCode),
            discountPrices: order.discounts.map((discount) => `${discount.discount} ${discount.discountCurrency}`)
        };
    } else {
        const customerContact = transaction.object.customerContact;

        return {
            id: transaction.id,
            status: transaction.status,
            startDate: (transaction.startDate !== undefined) ? transaction.startDate.toISOString() : '',
            endDate: (transaction.endDate !== undefined) ? transaction.endDate.toISOString() : '',
            customer: {
                name: (customerContact !== undefined) ? `${customerContact.last_name} ${customerContact.first_name}` : '',
                email: (customerContact !== undefined) ? customerContact.email : '',
                telephone: (customerContact !== undefined) ? customerContact.tel : '',
                group: transaction.object.purchaser_group
            },
            eventStartDate: '',
            eventEndDate: '',
            reservedTickets: '',
            orderNumber: '',
            confirmationNumber: '',
            price: '',
            paymentMethod: [],
            paymentMethodId: [],
            discounts: [],
            discountCodes: [],
            discountPrices: []
        };
    }
}
