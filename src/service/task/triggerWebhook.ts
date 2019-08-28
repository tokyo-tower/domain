import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import * as NotificationService from '../notification';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.TriggerWebhook>): IOperation<void> {
    return async (_: IConnectionSettings) => {
        await NotificationService.triggerWebhook(data)();
    };
}
