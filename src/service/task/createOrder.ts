import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as OrderRepo } from '../../repo/order';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as OrderService from '../order';

/**
 * タスク実行関数
 */
export function call(data: factory.task.createOrder.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const orderRepo = new OrderRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        await OrderService.createFromTransaction(data.transactionId)(orderRepo, transactionRepo);
    };
}
