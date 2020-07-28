import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as PerformanceRepo } from '../../repo/performance';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';

import * as AggregateService from '../aggregate';

/**
 * タスク実行関数
 */
export function call(data: factory.task.aggregateEventReservations.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await AggregateService.aggregateEventReservations(data)({
            performance: new PerformanceRepo(settings.connection),
            reservation: new ReservationRepo(settings.connection)
        });
    };
}
