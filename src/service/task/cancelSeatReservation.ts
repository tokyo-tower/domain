import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../../repo/rateLimit/ticketTypeCategory';

import * as StockService from '../stock';

/**
 * タスク実行関数
 */
export function call(data: factory.task.cancelSeatReservation.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await StockService.cancelSeatReservationAuth(data.transactionId)(
            new cinerino.repository.Action(settings.connection),
            new TicketTypeCategoryRateLimitRepo(settings.redisClient),
            new cinerino.repository.Task(settings.connection),
            new cinerino.repository.Project(settings.connection)
        );
    };
}
