import * as cinerino from '@cinerino/domain';

import { IConnectionSettings, IOperation } from '../task';

import * as factory from '@tokyotower/factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
// import { MongoRepository as TransactionRepo } from '../../repo/transaction';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.PayCreditCard>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new ActionRepo(settings.connection);
        const invoiceRepo = new cinerino.repository.Invoice(settings.connection);
        const projectRepo = new ProjectRepo(settings.connection);

        await cinerino.service.payment.creditCard.payCreditCard(data)({
            action: actionRepo,
            invoice: invoiceRepo,
            project: projectRepo
        });

        // 東京タワーでは、取引結果に売上結果連携が必要
        // if (payAction.result !== undefined) {
        //     const transactionRepo = new TransactionRepo(settings.connection);

        //     const orderNumber = payAction.purpose.orderNumber;
        //     const transactions = await transactionRepo.search({
        //         limit: 1,
        //         typeOf: factory.transactionType.PlaceOrder,
        //         result: { order: { orderNumbers: [orderNumber] } }
        //     });
        //     const transaction = transactions.shift();

        //     if (transaction !== undefined && Array.isArray(payAction.result.creditCardSales)) {
        //         await transactionRepo.transactionModel.findByIdAndUpdate(
        //             transaction.id,
        //             { 'result.creditCardSales': payAction.result.creditCardSales[0] }
        //         ).exec();
        //     }
        // }
    };
}
