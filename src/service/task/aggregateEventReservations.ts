import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { RedisRepository as EventWithAggregationRepo } from '../../repo/event';
import { MongoRepository as PerformanceRepo } from '../../repo/performance';
import { RedisRepository as CheckinGateRepo } from '../../repo/place/checkinGate';
// import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';

import * as AggregateService from '../aggregate';

/**
 * タスク実行関数
 */
export function call(data: factory.task.aggregateEventReservations.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await AggregateService.aggregateEventReservations(data)({
            checkinGate: new CheckinGateRepo(settings.redisClient),
            eventWithAggregation: new EventWithAggregationRepo(settings.redisClient),
            performance: new PerformanceRepo(settings.connection),
            reservation: new ReservationRepo(settings.connection)
        });
    };
}
