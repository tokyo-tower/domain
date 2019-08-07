import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as TaskRepo } from '../../repo/task';

import * as StockService from '../stock';

/**
 * タスク実行関数
 */
export function call(data: factory.task.cancelSeatReservation.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await StockService.cancelSeatReservationAuth(data.transactionId)(
            new ActionRepo(settings.connection),
            new TicketTypeCategoryRateLimitRepo(settings.redisClient),
            new TaskRepo(settings.connection),
            new ProjectRepo(settings.connection)
        );
    };
}
