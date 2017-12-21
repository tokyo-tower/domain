/**
 * 注文返品サービス
 * @namespace service.transaction.returnOrder
 */

import * as moment from 'moment';
import * as mongoose from 'mongoose';

import * as factory from '../../factory';

import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const CANCELLABLE_DAYS = 3;

export type ITransactionOperation<T> = (transactionRepo: TransactionRepo) => Promise<T>;

/**
 * 予約キャンセル処理
 * @memberof inquiry
 * @function cancel
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export function confirm(params: {
    /**
     * 主体者ID
     */
    agentId: string;
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
}): ITransactionOperation<factory.transaction.returnOrder.ITransaction> {
    return async (transactionRepo: TransactionRepo) => {
        const now = new Date();

        // 返品対象の取引取得
        const transaction = await transactionRepo.transactionModel.findOne(
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
        const creditCardSales = transactionResult.creditCardSales;

        // クレジットカード決済の場合、取引状態が実売上でなければまだ返品できない
        if (transaction.object.paymentMethod === factory.paymentMethodType.CreditCard && creditCardSales === undefined) {
            throw new factory.errors.Argument('transaction', 'Status not Sales.');
        }

        // 検証
        if (!params.forcibly) {
            validateRequest(now, transactionResult.eventReservations[0].performance_day);
        }

        const endDate = new Date();
        const eventReservations = transactionResult.eventReservations;
        const cancelName = `${eventReservations[0].purchaser_last_name} ${eventReservations[0].purchaser_first_name}`;
        const returnOrderAttributes = factory.transaction.returnOrder.createAttributes({
            status: factory.transactionStatusType.Confirmed,
            agent: {
                typeOf: factory.personType.Person,
                id: params.agentId
            },
            result: {},
            object: {
                transaction: transaction,
                cancelName: cancelName,
                cancellationFee: params.cancellationFee
            },
            expires: endDate,
            startDate: now,
            endDate: endDate,
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        });

        let returnOrderTransaction: factory.transaction.returnOrder.ITransaction;
        try {
            returnOrderTransaction = await transactionRepo.transactionModel.create(returnOrderAttributes)
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
function validateRequest(now: Date, performanceDay: string) {
    // 入塔予定日の3日前までキャンセル可能(3日前を過ぎていたらエラー)
    const cancellableThrough = moment(`${performanceDay} 00:00:00+09:00`, 'YYYYMMDD HH:mm:ssZ')
        .add(-CANCELLABLE_DAYS + 1, 'days').toDate();
    if (cancellableThrough <= now) {
        throw new factory.errors.Argument('performance_day', 'キャンセルできる期限を過ぎています。');
    }
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

    await transactionRepo.setTasksExportedById(transaction.id);
}

/**
 * ID指定で取引のタスク出力
 */
export async function exportTasksById(transactionId: string): Promise<factory.task.ITask[]> {
    const transactionRepo = new TransactionRepo(mongoose.connection);
    const taskRepo = new TaskRepo(mongoose.connection);

    const transaction = await transactionRepo.findReturnOrderById(transactionId);

    const taskAttributes: factory.task.IAttributes[] = [];
    switch (transaction.status) {
        case factory.transactionStatusType.Confirmed:
            taskAttributes.push(factory.task.returnOrder.createAttributes({
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

        case factory.transactionStatusType.Expired:

            break;

        default:
            throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
    }

    return Promise.all(taskAttributes.map(async (taskAttribute) => {
        return taskRepo.save(taskAttribute);
    }));
}
