import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as moment from 'moment-timezone';

import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { MongoRepository as TaskRepo } from '../repo/task';

import { credentials } from '../credentials';

const USE_IMPORT_OFFERS = process.env.USE_IMPORT_OFFERS === '1';

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: credentials.cinerino.authorizeServerDomain,
    clientId: credentials.cinerino.clientId,
    clientSecret: credentials.cinerino.clientSecret,
    scopes: [],
    state: ''
});

// 作成情報取得
const setting = {
    offerCodes: [
        '001',
        '002',
        '003',
        '004',
        '005',
        '006'
    ]
};

// tslint:disable-next-line:max-func-body-length
export function importFromCinerino(params: factory.chevre.event.IEvent<factory.chevre.eventType.ScreeningEvent>) {
    return async (repos: {
        performance: PerformanceRepo;
        task: TaskRepo;
    }) => {
        const event = params;

        const eventService = new cinerinoapi.service.Event({
            endpoint: credentials.cinerino.endpoint,
            auth: cinerinoAuthClient,
            project: { id: event.project.id }
        });

        let unitPriceOffers: cinerinoapi.factory.chevre.offer.IUnitPriceOffer[] | undefined;

        if (USE_IMPORT_OFFERS) {
            // ひとつめのイベントのオファー検索
            const offers = await eventService.searchTicketOffers({
                event: { id: event.id },
                seller: {
                    typeOf: <cinerinoapi.factory.organizationType>event.offers?.seller?.typeOf,
                    id: <string>event.offers?.seller?.id
                },
                store: {
                    id: credentials.cinerino.clientId
                }
            });

            unitPriceOffers = offers
                // 指定のオファーコードに限定する
                .filter((o) => setting.offerCodes.includes(o.identifier))
                .map((o) => {
                    // tslint:disable-next-line:max-line-length
                    const unitPriceSpec = <cinerinoapi.factory.chevre.priceSpecification.IPriceSpecification<cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification>>
                        o.priceSpecification.priceComponent.find(
                            (p) => p.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                        );

                    return {
                        ...o,
                        priceSpecification: unitPriceSpec
                    };
                });
        }

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
                ev_service_status: factory.performance.EvServiceStatus.Normal,
                ev_service_update_user: '',
                online_sales_status: factory.performance.OnlineSalesStatus.Normal,
                online_sales_update_user: '',
                refund_status: factory.performance.RefundStatus.None,
                refund_update_user: '',
                refunded_count: 0
            },
            ...{
                evServiceStatus: factory.performance.EvServiceStatus.Normal,
                onlineSalesStatus: factory.performance.OnlineSalesStatus.Normal
            },
            ...(Array.isArray(unitPriceOffers))
                ? {
                    ticket_type_group: {
                        id: <string>event.hasOfferCatalog?.id,
                        ticket_types: unitPriceOffers,
                        name: { ja: 'トップデッキツアー料金改定', en: 'Top Deck Tour' }
                    }
                }
                : undefined

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
