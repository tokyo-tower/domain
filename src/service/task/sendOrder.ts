import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.SendOrder>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (settings.redisClient === undefined) {
            throw new Error('settings.redisClient undefined.');
        }

        const actionRepo = new cinerino.repository.Action(settings.connection);
        const registerActionInProgressRepo = new cinerino.repository.action.RegisterProgramMembershipInProgress(settings.redisClient);
        const orderRepo = new cinerino.repository.Order(settings.connection);
        const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(settings.connection);
        const taskRepo = new cinerino.repository.Task(settings.connection);

        await cinerino.service.delivery.sendOrder(data)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            registerActionInProgress: registerActionInProgressRepo,
            task: taskRepo
        });
    };
}
