import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import * as NotificationService from '../notification';

/**
 * タスク実行関数
 */
export function call(data: factory.task.triggerWebhook.IData): IOperation<void> {
    return async (_: IConnectionSettings) => {
        await NotificationService.triggerWebhook(data)();
    };
}
