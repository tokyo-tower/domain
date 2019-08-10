import * as cinerino from '@cinerino/domain';
import { IConnectionSettings, IOperation } from '../task';

import * as factory from '@tokyotower/factory';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.PlaceOrder>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new cinerino.repository.Action(settings.connection);
        const invoiceRepo = new cinerino.repository.Invoice(settings.connection);
        const orderRepo = new cinerino.repository.Order(settings.connection);
        const taskRepo = new cinerino.repository.Task(settings.connection);
        const transactioinRepo = new cinerino.repository.Transaction(settings.connection);

        await cinerino.service.order.placeOrder(data)({
            action: actionRepo,
            invoice: invoiceRepo,
            order: orderRepo,
            task: taskRepo,
            transaction: transactioinRepo
        });
    };
}
