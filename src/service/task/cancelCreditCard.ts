import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';
import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.CancelCreditCard>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new ActionRepo(settings.connection);
        const projectRepo = new ProjectRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);

        await cinerino.service.payment.creditCard.cancelCreditCardAuth(data)({
            action: actionRepo,
            project: projectRepo,
            transaction: transactionRepo
        });
    };
}
