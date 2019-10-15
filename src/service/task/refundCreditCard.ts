import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.RefundCreditCard>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new cinerino.repository.Action(settings.connection);
        const orderRepo = new cinerino.repository.Order(settings.connection);
        const projectRepo = new cinerino.repository.Project(settings.connection);
        const sellerRepo = new cinerino.repository.Seller(settings.connection);
        const taskRepo = new cinerino.repository.Task(settings.connection);
        const transactionRepo = new cinerino.repository.Transaction(settings.connection);

        await cinerino.service.payment.creditCard.refundCreditCard(data)({
            action: actionRepo,
            order: orderRepo,
            project: projectRepo,
            seller: sellerRepo,
            task: taskRepo,
            transaction: transactionRepo
        });
    };
}
