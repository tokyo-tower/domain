import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as PerformanceRepo } from '../../repo/performance';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';

import * as OrderService from '../order';

/**
 * タスク実行関数
 */
export function call(data: factory.task.returnOrdersByPerformance.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new cinerino.repository.Action(settings.connection);
        const performanceRepo = new PerformanceRepo(settings.connection);
        const reservationRepo = new ReservationRepo(settings.connection);

        await OrderService.processReturnAllByPerformance(
            (<any>data).credentials,
            data.agentId,
            data.performanceId,
            data.clientIds,
            data.potentialActions
        )(
            actionRepo,
            performanceRepo,
            reservationRepo
        );
    };
}
