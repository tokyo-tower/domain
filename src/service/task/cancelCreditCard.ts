import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

/**
 * タスク実行関数
 */
export function call(data: factory.task.cancelCreditCard.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await cinerino.service.payment.creditCard.cancelCreditCardAuth(data)({
            action: new ActionRepo(settings.connection),
            project: new ProjectRepo(settings.connection),
            transaction: new TransactionRepo(settings.connection)
        });
    };
}
