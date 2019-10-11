import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment-timezone';

import { RedisRepository as EventWithAggregationRepo } from '../repo/event';
import { MongoRepository as PerformanceRepo } from '../repo/performance';

const debug = createDebug('ttts-domain:service');

const MAXIMUM_ATTENDEE_CAPACITY = (process.env.MAXIMUM_ATTENDEE_CAPACITY !== undefined)
    ? Number(process.env.MAXIMUM_ATTENDEE_CAPACITY)
    // tslint:disable-next-line:no-magic-numbers
    : 41;

export interface ISearchResult {
    performances: factory.performance.IPerformanceWithAvailability[];
    numberOfPerformances: number;
    filmIds: string[];
}

export type ISearchOperation<T> = (
    performanceRepo: PerformanceRepo,
    eventWithAggregationRepo: EventWithAggregationRepo
) => Promise<T>;

/**
 * 検索する
 */
export function search(searchConditions: factory.performance.ISearchConditions): ISearchOperation<ISearchResult> {
    // tslint:disable-next-line:max-func-body-length
    return async (
        performanceRepo: PerformanceRepo,
        eventWithAggregationRepo: EventWithAggregationRepo
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
        const eventsWithAggregation = await eventWithAggregationRepo.findAll();
        debug(eventsWithAggregation.length, 'eventsWithAggregation found.');

        const data: factory.performance.IPerformanceWithAvailability[] = performances.map((performance) => {
            const ticketTypes = (performance.ticket_type_group !== undefined) ? performance.ticket_type_group.ticket_types : [];
            const eventWithAggregation = eventsWithAggregation.find((e) => e.id === performance.id);

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
                // start_date: performance.startDate,
                // end_date: performance.endDate,
                seat_status: (eventWithAggregation !== undefined)
                    ? eventWithAggregation.remainingAttendeeCapacity
                    : undefined,
                tour_number: tourNumber,
                wheelchair_available: (eventWithAggregation !== undefined)
                    ? eventWithAggregation.remainingAttendeeCapacityForWheelchair
                    : undefined,
                ticket_types: ticketTypes.map((ticketType) => {
                    const offerAggregation = (eventWithAggregation !== undefined && eventWithAggregation.offers !== undefined)
                        ? eventWithAggregation.offers.find((o) => o.id === ticketType.id)
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
                remainingAttendeeCapacity: (eventWithAggregation !== undefined)
                    ? eventWithAggregation.remainingAttendeeCapacity
                    : undefined,
                remainingAttendeeCapacityForWheelchair: (eventWithAggregation !== undefined)
                    ? eventWithAggregation.remainingAttendeeCapacityForWheelchair
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
export function onOrderReturned(params: {
    orderNumber: string;
}) {
    return async (repos: {
        order: cinerino.repository.Order;
        performance: PerformanceRepo;
        transaction: cinerino.repository.Transaction;
    }) => {
        const order = await repos.order.findByOrderNumber({ orderNumber: params.orderNumber });

        const returnOrderTransactions = await repos.transaction.search<factory.transactionType.ReturnOrder>({
            limit: 1,
            typeOf: factory.transactionType.ReturnOrder,
            object: { order: { orderNumbers: [order.orderNumber] } }
        });
        const returnOrderTransaction = returnOrderTransactions.shift();
        if (returnOrderTransaction === undefined) {
            throw new factory.errors.NotFound('ReturnOrderTransaction');
        }

        // 販売者都合の手数料なし返品であれば、情報連携
        if (returnOrderTransaction.object.reason === factory.transaction.returnOrder.Reason.Seller
            && returnOrderTransaction.object.cancellationFee === 0) {
            // パフォーマンスに返品済数を連携
            await repos.performance.updateOne(
                // tslint:disable-next-line:max-line-length
                { _id: (<factory.cinerino.order.IReservation>order.acceptedOffers[0].itemOffered).reservationFor.id },
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
                    // tslint:disable-next-line:max-line-length
                    _id: (<factory.cinerino.order.IReservation>order.acceptedOffers[0].itemOffered).reservationFor.id,
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
