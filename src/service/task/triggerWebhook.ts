import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.TriggerWebhook>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await cinerino.service.notification.triggerWebhook(data)({
            action: new cinerino.repository.Action(settings.connection)
        });
    };
}
