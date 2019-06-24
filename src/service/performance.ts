/**
 * パフォーマンスサービス
 */
import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';

import * as repository from '../repository';

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
    performanceRepo: repository.Performance,
    eventWithAggregation: repository.EventWithAggregation
) => Promise<T>;

/**
 * 検索する
 * @param {ISearchConditions} searchConditions 検索条件
 * @return {ISearchOperation<ISearchResult>} 検索結果
 * @memberof service.performance
 */
export function search(searchConditions: factory.performance.ISearchConditions): ISearchOperation<ISearchResult> {
    // tslint:disable-next-line:max-func-body-length
    return async (
        performanceRepo: repository.Performance,
        eventWithAggregationRepo: repository.EventWithAggregation
    ) => {
        // 作品件数取得
        const filmIds = await performanceRepo.distinct('film.id', searchConditions);

        // 総数検索
        const performancesCount = await performanceRepo.count(searchConditions);

        const performances = await performanceRepo.search({
            ...searchConditions,
            // tslint:disable-next-line:no-magic-numbers
            limit: (searchConditions.limit !== undefined) ? searchConditions.limit : 1000,
            page: (searchConditions.page !== undefined) ? searchConditions.page : 1,
            sort: (searchConditions.sort !== undefined)
                ? searchConditions.sort
                : {
                    day: 1,
                    start_time: 1
                }
        });
        debug('performances found.', performances);

        // 空席情報を追加
        const eventsWithAggregation = await eventWithAggregationRepo.findAll();
        debug(eventsWithAggregation.length, 'eventsWithAggregation found.');

        const data: factory.performance.IPerformanceWithAvailability[] = performances.map((performance) => {
            const ticketTypes: factory.offer.seatReservation.ITicketType[] = performance.ticket_type_group.ticket_types;
            const eventWithAggregation = eventsWithAggregation.find((e) => e.id === performance.id);

            return {
                id: performance.id,
                doorTime: performance.door_time,
                startDate: performance.start_date,
                endDate: performance.end_date,
                duration: performance.duration,
                tourNumber: performance.tour_number,
                evServiceStatus: performance.ttts_extension.ev_service_status,
                onlineSalesStatus: performance.ttts_extension.online_sales_status,
                maximumAttendeeCapacity: MAXIMUM_ATTENDEE_CAPACITY,
                remainingAttendeeCapacity: (eventWithAggregation !== undefined)
                    ? eventWithAggregation.remainingAttendeeCapacity
                    : undefined,
                remainingAttendeeCapacityForWheelchair: (eventWithAggregation !== undefined)
                    ? eventWithAggregation.remainingAttendeeCapacityForWheelchair
                    : undefined,
                ticketTypes: ticketTypes.map((ticketType) => {
                    const offerAggregation = (eventWithAggregation !== undefined && eventWithAggregation.offers !== undefined)
                        ? eventWithAggregation.offers.find((o) => o.id === ticketType.id)
                        : undefined;

                    const unitPriceSpec = ticketType.priceSpecification;

                    return {
                        ...ticketType,
                        // POSに対するAPI互換性維持のため、charge属性追加
                        charge: (unitPriceSpec !== undefined) ? unitPriceSpec.price : undefined,
                        remainingAttendeeCapacity: (offerAggregation !== undefined)
                            ? offerAggregation.remainingAttendeeCapacity
                            : undefined
                    };
                }),
                extension: performance.ttts_extension,
                additionalProperty: performance.additionalProperty,
                attributes: {
                    day: performance.day,
                    open_time: performance.open_time,
                    start_time: performance.start_time,
                    end_time: performance.end_time,
                    start_date: performance.start_date,
                    end_date: performance.end_date,
                    // tslint:disable-next-line:no-magic-numbers
                    seat_status: (eventWithAggregation !== undefined)
                        ? eventWithAggregation.remainingAttendeeCapacity
                        : undefined,
                    wheelchair_available: (eventWithAggregation !== undefined)
                        ? eventWithAggregation.remainingAttendeeCapacityForWheelchair
                        : undefined,
                    ticket_types: ticketTypes.map((ticketType) => {
                        const offerAggregation = (eventWithAggregation !== undefined && eventWithAggregation.offers !== undefined)
                            ? eventWithAggregation.offers.find((o) => o.id === ticketType.id)
                            : undefined;

                        const unitPriceSpec = ticketType.priceSpecification;

                        return {
                            ...ticketType,
                            // POSに対するAPI互換性維持のため、charge属性追加
                            charge: (unitPriceSpec !== undefined) ? unitPriceSpec.price : undefined,
                            ...{
                                available_num: (offerAggregation !== undefined) ? offerAggregation.remainingAttendeeCapacity : undefined
                            }
                        };
                    }),
                    tour_number: performance.ttts_extension.tour_number,
                    online_sales_status: performance.ttts_extension.online_sales_status,
                    refunded_count: performance.ttts_extension.refunded_count,
                    refund_status: performance.ttts_extension.refund_status,
                    ev_service_status: performance.ttts_extension.ev_service_status
                }
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
 * 入場数の集計を行う
 * @param checkinGates 入場ゲートリスト
 * @param reservations 予約リスト
 * @param offers 販売情報リスト
 */
export async function aggregateCheckinCount(
    checkinGates: factory.place.checkinGate.IPlace[],
    reservations: factory.reservation.event.IReservation[],
    offers: factory.offer.seatReservation.ITicketType[]
): Promise<{
    checkinCount: number;
    checkinCountsByWhere: factory.performance.ICheckinCountByWhere[];
}> {
    // 全予約の入場履歴をマージ
    const allUniqueCheckins: factory.performance.ICheckinWithTicketType[] = reservations.reduce(
        (a, b) => {
            // 同一ポイントでの重複チェックインを除外
            // チェックポイントに現れた物理的な人数を数えるのが目的なのでチェックイン行為の重複を場外
            const checkinWheres = b.checkins.map((c) => c.where);
            const uniqueCheckins = b.checkins
                .filter((c, pos) => checkinWheres.indexOf(c.where) === pos)
                .map((c) => {
                    return {
                        ...c,
                        ticketType: b.reservedTicket.ticketType.id,
                        ticketCategory: b.ticket_ttts_extension.category
                    };
                });

            return [...a, ...uniqueCheckins];
        },
        []
    );

    // 入場ゲートごとに、券種ごとの入場者数を算出する
    const checkinCountsByWhere = checkinGates.map((checkinGate) => {
        // この入場ゲートの入場履歴
        const uniqueCheckins4where = allUniqueCheckins.filter((c) => c.where === checkinGate.identifier);

        return {
            where: checkinGate.identifier,
            checkinCountsByTicketType: offers.map((offer) => {
                return {
                    ticketType: offer.id,
                    ticketCategory: offer.ttts_extension.category,
                    // この券種の入場履歴数を集計
                    count: uniqueCheckins4where.filter((c) => c.ticketType === offer.id).length
                };
            })
        };
    });

    return {
        checkinCount: allUniqueCheckins.length,
        checkinCountsByWhere: checkinCountsByWhere
    };
}
