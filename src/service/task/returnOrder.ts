import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as OrderRepo } from '../../repo/order';
import { MongoRepository as PerformanceRepo } from '../../repo/performance';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as OrderService from '../order';

/**
 * タスク実行関数
 */
export function call(data: factory.task.returnOrder.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await OrderService.processReturn(data.transactionId)(
            new ActionRepo(settings.connection),
            new PerformanceRepo(settings.connection),
            new ReservationRepo(settings.connection),
            new TransactionRepo(settings.connection),
            new TicketTypeCategoryRateLimitRepo(settings.redisClient),
            new TaskRepo(settings.connection),
            new OrderRepo(settings.connection),
            new ProjectRepo(settings.connection)
        );
    };
}
