import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as SalesService from '../sales';

/**
 * タスク実行関数
 */
export function call(data: factory.task.settleCreditCard.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await SalesService.settleCreditCardAuth(data.transactionId)(
            new TransactionRepo(settings.connection)
        );
    };
}
