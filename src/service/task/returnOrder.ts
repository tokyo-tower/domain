import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as PerformanceRepo } from '../../repo/performance';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';

import * as OrderService from '../order';

/**
 * タスク実行関数
 */
export function call(data: factory.task.returnOrder.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await OrderService.processReturn(data.transactionId)(
            new cinerino.repository.Action(settings.connection),
            new PerformanceRepo(settings.connection),
            new ReservationRepo(settings.connection),
            new cinerino.repository.Transaction(settings.connection),
            new TicketTypeCategoryRateLimitRepo(settings.redisClient),
            new cinerino.repository.Task(settings.connection),
            new cinerino.repository.Order(settings.connection),
            new cinerino.repository.Project(settings.connection)
        );
    };
}
