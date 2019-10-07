import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as PerformanceRepo } from '../../repo/performance';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';

import * as OrderService from '../order';

/**
 * タスク実行関数
 */
export function call(data: factory.task.returnOrder.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await OrderService.processReturn(data.transactionId)({
            action: new cinerino.repository.Action(settings.connection),
            order: new cinerino.repository.Order(settings.connection),
            ownershipInfo: new cinerino.repository.OwnershipInfo(settings.connection),
            performance: new PerformanceRepo(settings.connection),
            transaction: new cinerino.repository.Transaction(settings.connection),
            task: new cinerino.repository.Task(settings.connection),
            reservation: new ReservationRepo(settings.connection),
            ticketTypeCategoryRateLimit: new cinerino.repository.rateLimit.TicketTypeCategory(settings.redisClient),
            project: new cinerino.repository.Project(settings.connection)
        });
    };
}
