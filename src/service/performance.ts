import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment-timezone';

// import { RedisRepository as EventWithAggregationRepo } from '../repo/event';
import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { MongoRepository as TaskRepo } from '../repo/task';

import { credentials } from '../credentials';

const debug = createDebug('ttts-domain:service');

const MAXIMUM_ATTENDEE_CAPACITY = (process.env.MAXIMUM_ATTENDEE_CAPACITY !== undefined)
    ? Number(process.env.MAXIMUM_ATTENDEE_CAPACITY)
    // tslint:disable-next-line:no-magic-numbers
    : 41;

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: credentials.cinerino.authorizeServerDomain,
    clientId: credentials.cinerino.clientId,
    clientSecret: credentials.cinerino.clientSecret,
    scopes: [],
    state: ''
});

export interface ISearchResult {
    performances: factory.performance.IPerformanceWithAvailability[];
    numberOfPerformances: number;
    filmIds: string[];
}

export type ISearchOperation<T> = (
    performanceRepo: PerformanceRepo
    // eventWithAggregationRepo: EventWithAggregationRepo
) => Promise<T>;

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

export function importFromCinerino(params: factory.chevre.event.IEvent<factory.chevre.eventType.ScreeningEvent>) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        performance: PerformanceRepo;
        task: TaskRepo;
    }) => {
        const event = params;

        const eventService = new cinerinoapi.service.Event({
            endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            auth: cinerinoAuthClient,
            project: { id: event.project.id }
        });

        const offerCodes = setting.offerCodes;

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

        const unitPriceOffers: cinerinoapi.factory.chevre.offer.IUnitPriceOffer[] = offers
            // 指定のオファーコードに限定する
            .filter((o) => offerCodes.includes(o.identifier))
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

        let tourNumber = '';
        if (Array.isArray(event.additionalProperty)) {
            const tourNumberProperty = event.additionalProperty.find((p) => p.name === 'tourNumber');
            if (tourNumberProperty !== undefined) {
                tourNumber = tourNumberProperty.value;
            }
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
            superEvent: event.superEvent,
            location: {
                id: event.location.branchCode,
                branchCode: event.location.branchCode,
                name: <any>event.location.name
            },
            additionalProperty: event.additionalProperty,
            ttts_extension: {
                tour_number: tourNumber,
                ev_service_status: factory.performance.EvServiceStatus.Normal,
                ev_service_update_user: '',
                online_sales_status: factory.performance.OnlineSalesStatus.Normal,
                online_sales_update_user: '',
                refund_status: factory.performance.RefundStatus.None,
                refund_update_user: '',
                refunded_count: 0
            },
            ticket_type_group: {
                id: <string>event.hasOfferCatalog?.id,
                ticket_types: unitPriceOffers,
                name: { ja: 'トップデッキツアー料金改定', en: 'Top Deck Tour' }
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
 * 検索する
 */
export function search(searchConditions: factory.performance.ISearchConditions): ISearchOperation<ISearchResult> {
    // tslint:disable-next-line:max-func-body-length
    return async (
        performanceRepo: PerformanceRepo
        // eventWithAggregationRepo: EventWithAggregationRepo
    ) => {
        // 作品件数取得
        const filmIds = await performanceRepo.distinct('superEvent.workPerformed.identifier', searchConditions);

        // 総数検索
        const performancesCount = await performanceRepo.count(searchConditions);

        const performances = await performanceRepo.search({
            ...searchConditions,
            // tslint:disable-next-line:no-magic-numbers
            limit: (searchConditions.limit !== undefined) ? searchConditions.limit : 1000,
            page: (searchConditions.page !== undefined) ? searchConditions.page : 1,
            sort: (searchConditions.sort !== undefined)
                ? searchConditions.sort
                : { startDate: 1 }
        });
        debug(performances.length, 'performances found.');

        // 空席情報を追加
        // const eventsWithAggregation = await eventWithAggregationRepo.findAll();
        // debug(eventsWithAggregation.length, 'eventsWithAggregation found.');

        const data: factory.performance.IPerformanceWithAvailability[] = performances.map((performance) => {
            const ticketTypes = (performance.ticket_type_group !== undefined) ? performance.ticket_type_group.ticket_types : [];
            // const eventWithAggregation = eventsWithAggregation.find((e) => e.id === performance.id);

            let tourNumber: string = (<any>performance).tour_number; // 古いデーターに対する互換性対応
            if (performance.additionalProperty !== undefined) {
                const tourNumberProperty = performance.additionalProperty.find((p) => p.name === 'tourNumber');
                if (tourNumberProperty !== undefined) {
                    tourNumber = tourNumberProperty.value;
                }
            }

            const attributes = {
                day: moment(performance.startDate).tz('Asia/Tokyo').format('YYYYMMDD'),
                open_time: moment(performance.doorTime).tz('Asia/Tokyo').format('HHmm'),
                start_time: moment(performance.startDate).tz('Asia/Tokyo').format('HHmm'),
                end_time: moment(performance.endDate).tz('Asia/Tokyo').format('HHmm'),
                seat_status: (typeof performance.remainingAttendeeCapacity === 'number')
                    ? performance.remainingAttendeeCapacity
                    : undefined,
                tour_number: tourNumber,
                wheelchair_available: (typeof performance.remainingAttendeeCapacityForWheelchair === 'number')
                    ? performance.remainingAttendeeCapacityForWheelchair
                    : undefined,
                ticket_types: ticketTypes.map((ticketType) => {
                    const offerAggregation = (Array.isArray(performance.offers))
                        ? performance.offers.find((o) => o.id === ticketType.id)
                        : undefined;

                    const unitPriceSpec = ticketType.priceSpecification;

                    return {
                        name: ticketType.name,
                        id: ticketType.identifier, // POSに受け渡すのは券種IDでなく券種コードなので要注意
                        // POSに対するAPI互換性維持のため、charge属性追加
                        charge: (unitPriceSpec !== undefined) ? unitPriceSpec.price : undefined,
                        available_num: (offerAggregation !== undefined) ? offerAggregation.remainingAttendeeCapacity : undefined
                    };
                }),
                online_sales_status: (performance.ttts_extension !== undefined)
                    ? performance.ttts_extension.online_sales_status : factory.performance.OnlineSalesStatus.Normal,
                refunded_count: (performance.ttts_extension !== undefined)
                    ? performance.ttts_extension.refunded_count : undefined,
                refund_status: (performance.ttts_extension !== undefined)
                    ? performance.ttts_extension.refund_status : undefined,
                ev_service_status: (performance.ttts_extension !== undefined)
                    ? performance.ttts_extension.ev_service_status : undefined
            };

            return {
                ...performance,
                id: performance.id,
                doorTime: performance.doorTime,
                startDate: performance.startDate,
                endDate: performance.endDate,
                duration: performance.duration,
                tourNumber: tourNumber,
                evServiceStatus: (performance.ttts_extension !== undefined)
                    ? performance.ttts_extension.ev_service_status
                    : factory.performance.EvServiceStatus.Normal,
                onlineSalesStatus: (performance.ttts_extension !== undefined)
                    ? performance.ttts_extension.online_sales_status
                    : factory.performance.OnlineSalesStatus.Normal,
                maximumAttendeeCapacity: MAXIMUM_ATTENDEE_CAPACITY,
                remainingAttendeeCapacity: (typeof performance.remainingAttendeeCapacity === 'number')
                    ? performance.remainingAttendeeCapacity
                    : undefined,
                remainingAttendeeCapacityForWheelchair: (typeof performance.remainingAttendeeCapacityForWheelchair === 'number')
                    ? performance.remainingAttendeeCapacityForWheelchair
                    : undefined,
                extension: (performance.ttts_extension !== undefined) ? performance.ttts_extension : <any>{},
                additionalProperty: performance.additionalProperty,
                // attributes属性は、POSに対するAPI互換性維持のため
                attributes: attributes
            };
        });

        return {
            performances: data,
            numberOfPerformances: performancesCount,
            filmIds: filmIds
        };
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
