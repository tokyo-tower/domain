import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.ReturnOrder>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await cinerino.service.order.returnOrder(data)({
            action: new cinerino.repository.Action(settings.connection),
            order: new cinerino.repository.Order(settings.connection),
            ownershipInfo: new cinerino.repository.OwnershipInfo(settings.connection),
            transaction: new cinerino.repository.Transaction(settings.connection),
            task: new cinerino.repository.Task(settings.connection)
        });
    };
}
