import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../../repo/rateLimit/ticketTypeCategory';

import * as StockService from '../stock';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.CancelSeatReservation>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new cinerino.repository.Action(settings.connection);
        const projectRepo = new cinerino.repository.Project(settings.connection);
        const taskRepo = new cinerino.repository.Task(settings.connection);
        const ticketTypeCategoryRateLimitRepo = new TicketTypeCategoryRateLimitRepo(settings.redisClient);

        await StockService.cancelSeatReservationAuth(data)({
            action: actionRepo,
            project: projectRepo,
            task: taskRepo,
            ticketTypeCategoryRateLimit: ticketTypeCategoryRateLimitRepo
        });
    };
}
