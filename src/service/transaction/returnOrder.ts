/**
 * 注文返品サービス
 * @namespace service.transaction.returnOrder
 */

import * as moment from 'moment';
import * as mongoose from 'mongoose';

import * as errors from '../../factory/errors';
import { IAttributes as ITaskAttributes, ITask } from '../../factory/task';
import * as ReturnOrderTaskFactory from '../../factory/task/returnOrder';
import TaskStatus from '../../factory/taskStatus';
import * as PlaceOrderTransactionFactory from '../../factory/transaction/placeOrder';
import * as ReturnOrderTransactionFactory from '../../factory/transaction/returnOrder';
import TransactionStatusType from '../../factory/transactionStatusType';
import TransactionTasksExportationStatus from '../../factory/transactionTasksExportationStatus';
import TransactionType from '../../factory/transactionType';

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
    // performanceDay: string;
    // paymentNo: string;
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
}): ITransactionOperation<ReturnOrderTransactionFactory.ITransaction> {
    return async (transactionRepo: TransactionRepo) => {
        const now = new Date();

        // 返品対象の取引取得
        const transaction = await transactionRepo.transactionModel.findOne(
            {
                typeOf: TransactionType.PlaceOrder,
                status: TransactionStatusType.Confirmed,
                _id: params.transactionId
                // 'result.eventReservations.performance_day': params.performanceDay,
                // 'result.eventReservations.payment_no': params.paymentNo
            }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new errors.NotFound('transaction');
            }

            return <PlaceOrderTransactionFactory.ITransaction>doc.toObject();
        });

        const transactionResult = <PlaceOrderTransactionFactory.IResult>transaction.result;

        // GMO取引状態確認
        // tslint:disable-next-line:no-suspicious-comment
        // TODO GMOを参照するとレート制限にひっかかるので、DBにGMO取引状態を持つように変更する
        // const searchTradeResult = await GMO.services.credit.searchTrade({
        //     shopId: <string>process.env.GMO_SHOP_ID,
        //     shopPass: <string>process.env.GMO_SHOP_PASS,
        //     orderId: transactionResult.gmoOrderId
        // });

        // 取引状態が実売上でなければまだ返品できない
        // if (searchTradeResult.status !== GMO.utils.util.Status.Sales) {
        //     throw new errors.Argument('transaction', 'Status not Sales.');
        // }

        // 検証
        if (!params.forcibly) {
            validateRequest(now, transactionResult.eventReservations[0].performance_day);
        }

        const endDate = new Date();
        const eventReservations = transactionResult.eventReservations;
        const cancelName = `${eventReservations[0].purchaser_last_name} ${eventReservations[0].purchaser_first_name}`;
        const returnOrderAttributes = ReturnOrderTransactionFactory.createAttributes({
            status: TransactionStatusType.Confirmed,
            agent: <any>{
            },
            result: {},
            object: {
                transaction: transaction,
                cancelName: cancelName,
                cancellationFee: params.cancellationFee,
                gmoTradeBefore: <any>null
            },
            expires: endDate,
            startDate: now,
            endDate: endDate,
            tasksExportationStatus: TransactionTasksExportationStatus.Unexported
        });

        return transactionRepo.transactionModel.create(returnOrderAttributes)
            .then((doc) => <ReturnOrderTransactionFactory.ITransaction>doc.toObject());
    };
}

/**
 * キャンセル検証
 */
function validateRequest(now: Date, performanceDay: string) {
    // 入塔予定日+キャンセル可能日が本日日付を過ぎていたらエラー
    // if (cancellationFee < 0) {
    //     (<any>errors).cancelDays = {msg: 'キャンセルできる期限を過ぎています。'};
    // }

    // 入塔予定日の3日前までキャンセル可能(3日前を過ぎていたらエラー)
    const cancellableThrough = moment(`${performanceDay} 00:00:00+09:00`, 'YYYYMMDD HH:mm:ssZ')
        .add(-CANCELLABLE_DAYS + 1, 'days').toDate();
    if (cancellableThrough <= now) {
        throw new errors.Argument('performance_day', 'キャンセルできる期限を過ぎています。');
    }
}

/**
 * 返品取引のタスクをエクスポートする
 */
export async function exportTasks(status: TransactionStatusType) {
    const transactionRepo = new TransactionRepo(mongoose.connection);

    const statusesTasksExportable = [TransactionStatusType.Expired, TransactionStatusType.Confirmed];
    if (statusesTasksExportable.indexOf(status) < 0) {
        throw new errors.Argument('status', `transaction status should be in [${statusesTasksExportable.join(',')}]`);
    }

    const transaction = await transactionRepo.transactionModel.findOneAndUpdate(
        {
            typeOf: TransactionType.ReturnOrder,
            status: status,
            tasksExportationStatus: TransactionTasksExportationStatus.Unexported
        },
        { tasksExportationStatus: TransactionTasksExportationStatus.Exporting },
        { new: true }
    ).exec()
        .then((doc) => (doc === null) ? null : <ReturnOrderTransactionFactory.ITransaction>doc.toObject());

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
export async function exportTasksById(transactionId: string): Promise<ITask[]> {
    const transactionRepo = new TransactionRepo(mongoose.connection);
    const taskRepo = new TaskRepo(mongoose.connection);

    const transaction = await transactionRepo.findReturnOrderById(transactionId);

    const taskAttributes: ITaskAttributes[] = [];
    switch (transaction.status) {
        case TransactionStatusType.Confirmed:
            taskAttributes.push(ReturnOrderTaskFactory.createAttributes({
                status: TaskStatus.Ready,
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

        case TransactionStatusType.Expired:

            break;

        default:
            throw new errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
    }

    return Promise.all(taskAttributes.map(async (taskAttribute) => {
        return taskRepo.save(taskAttribute);
    }));
}
