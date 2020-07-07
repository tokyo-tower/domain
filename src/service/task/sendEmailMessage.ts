import * as cinerinoapi from '@cinerino/sdk';
import { IConnectionSettings, IOperation } from '../task';

import * as NotificationService from '../notification';

/**
 * タスク実行関数
 */
export function call(data: cinerinoapi.factory.task.IData<cinerinoapi.factory.taskName.SendEmailMessage>): IOperation<void> {
    return async (__: IConnectionSettings) => {
        await NotificationService.sendEmailMessage(data.actionAttributes)({});
    };
}
