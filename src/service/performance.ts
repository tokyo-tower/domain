import * as factory from '@tokyotower/factory';
import * as moment from 'moment-timezone';

import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { MongoRepository as TaskRepo } from '../repo/task';

export function importFromCinerino(params: factory.chevre.event.IEvent<factory.chevre.eventType.ScreeningEvent>) {
    return async (repos: {
        performance: PerformanceRepo;
        task: TaskRepo;
    }) => {
        const event = params;

        // パフォーマンス登録
        const performance: factory.performance.IPerformance = {
            id: event.id,
            startDate: moment(event.startDate)
                .toDate(),
            endDate: moment(event.endDate)
                .toDate(),
            eventStatus: event.eventStatus,
            additionalProperty: event.additionalProperty,
            ttts_extension: {
                ev_service_update_user: '',
                online_sales_update_user: '',
                refund_status: factory.performance.RefundStatus.None,
                refund_update_user: '',
                refunded_count: 0
            }
        };

        await repos.performance.saveIfNotExists(performance);

        // 集計タスク作成
        const aggregateTask: factory.task.aggregateEventReservations.IAttributes = {
            name: <any>factory.taskName.AggregateEventReservations,
            project: { typeOf: factory.chevre.organizationType.Project, id: event.project.id },
            status: factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { id: performance.id }
        };
        await repos.task.save(aggregateTask);
    };
}
