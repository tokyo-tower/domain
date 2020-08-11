import * as cinerinoapi from '@cinerino/sdk';
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
            doorTime: moment(event.doorTime)
                .toDate(),
            startDate: moment(event.startDate)
                .toDate(),
            endDate: moment(event.endDate)
                .toDate(),
            duration: <string>event.superEvent.duration,
            eventStatus: event.eventStatus,
            superEvent: event.superEvent,
            location: {
                id: event.location.branchCode,
                branchCode: event.location.branchCode,
                name: <any>event.location.name
            },
            additionalProperty: event.additionalProperty,
            ttts_extension: {
                ev_service_update_user: '',
                online_sales_update_user: '',
                refund_status: factory.performance.RefundStatus.None,
                refund_update_user: '',
                refunded_count: 0,
                // 暫定対応、不要になったら削除
                ...{
                    ev_service_status: factory.performance.EvServiceStatus.Normal,
                    online_sales_status: factory.performance.OnlineSalesStatus.Normal
                }
            }
        };

        await repos.performance.saveIfNotExists(performance);

        // 集計タスク作成
        const aggregateTask: factory.task.aggregateEventReservations.IAttributes = {
            name: <any>factory.taskName.AggregateEventReservations,
            project: { typeOf: cinerinoapi.factory.organizationType.Project, id: event.project.id },
            status: factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { id: performance.id }
        };
        await repos.task.save(<any>aggregateTask);
    };
}

/**
 * 注文返品時の情報連携
 */
export function onOrderReturned(params: cinerinoapi.factory.order.IOrder) {
    return async (repos: {
        performance: PerformanceRepo;
    }) => {
        const order = params;
        const event = (<cinerinoapi.factory.order.IReservation>order.acceptedOffers[0].itemOffered).reservationFor;

        // 販売者都合の手数料なし返品であれば、情報連携
        let cancellationFee = 0;
        if (order.returner !== undefined && order.returner !== null) {
            const returner = order.returner;
            if (Array.isArray(returner.identifier)) {
                const cancellationFeeProperty = returner.identifier.find((p: any) => p.name === 'cancellationFee');
                if (cancellationFeeProperty !== undefined) {
                    cancellationFee = Number(cancellationFeeProperty.value);
                }
            }
        }

        let reason: string = cinerinoapi.factory.transaction.returnOrder.Reason.Customer;
        if (order.returner !== undefined && order.returner !== null) {
            const returner = order.returner;
            if (Array.isArray(returner.identifier)) {
                const reasonProperty = returner.identifier.find((p: any) => p.name === 'reason');
                if (reasonProperty !== undefined) {
                    reason = reasonProperty.value;
                }
            }
        }

        if (reason === cinerinoapi.factory.transaction.returnOrder.Reason.Seller && cancellationFee === 0) {
            // パフォーマンスに返品済数を連携
            await repos.performance.updateOne(
                { _id: event.id },
                {
                    $inc: {
                        'ttts_extension.refunded_count': 1,
                        'ttts_extension.unrefunded_count': -1
                    },
                    'ttts_extension.refund_update_at': new Date()
                }
            );

            // すべて返金完了したら、返金ステータス変更
            await repos.performance.updateOne(
                {
                    _id: event.id,
                    'ttts_extension.unrefunded_count': 0
                },
                {
                    'ttts_extension.refund_status': factory.performance.RefundStatus.Compeleted,
                    'ttts_extension.refund_update_at': new Date()
                }
            );
        }
    };
}
