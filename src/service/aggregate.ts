/**
 * 集計サービス
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as repository from '../repository';

import * as Report4SalesService from './aggregate/report4sales';

import { credentials } from '../credentials';

const debug = createDebug('ttts-domain:service');

export enum SeatingType {
    Normal = 'Normal',
    Wheelchair = 'Wheelchair'
}

export enum TicketTypeCategory {
    Normal = 'Normal',
    Wheelchair = 'Wheelchair'
}

// const WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS = 6;

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: credentials.cinerino.authorizeServerDomain,
    clientId: credentials.cinerino.clientId,
    clientSecret: credentials.cinerino.clientSecret,
    scopes: [],
    state: ''
});

const eventService = new cinerinoapi.service.Event({
    endpoint: credentials.cinerino.endpoint,
    auth: cinerinoAuthClient
});

const placeService = new cinerinoapi.service.Place({
    endpoint: credentials.cinerino.endpoint,
    auth: cinerinoAuthClient
});

export {
    Report4SalesService as report4sales
};

/**
 * 特定のイベントに関する予約集計を行う
 */
export function aggregateEventReservations(params: {
    id: string;
}) {
    return async (repos: {
        performance: repository.Performance;
        reservation: repository.Reservation;
    }) => {
        const event = await repos.performance.findById(params.id);
        debug('event', event.id, 'found');

        // 同日の、同時刻隊のツアーに関しても集計する(車椅子残席数が影響し合うため)
        const startFrom = moment(event.startDate)
            .startOf('hour')
            .toDate();
        const startThrough = moment(startFrom)
            .add(1, 'hour')
            .add(-1, 'second')
            .toDate();
        debug('searching aggregating events...', startFrom, '-', startThrough);
        const aggregatingEvents = await repos.performance.search({
            limit: 100,
            startFrom: startFrom,
            startThrough: startThrough
        });
        debug(aggregatingEvents.length, 'aggregatingEvents found');

        // 入場ゲート取得
        const searchMovieTheatersResult = await placeService.searchMovieTheaters({ branchCodes: [event.superEvent.location.branchCode] });
        const movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new factory.errors.NotFound('MovieTheater');
        }

        let checkGates: factory.place.checkinGate.IPlace[] = [];
        if (Array.isArray(movieTheater.hasEntranceGate)) {
            checkGates = movieTheater.hasEntranceGate.map((g) => {
                return {
                    identifier: String(g.identifier),
                    name: (typeof g.name === 'string') ? g.name : String(g.name?.ja)
                };
            });
        }
        debug(checkGates.length, 'checkGates found');

        for (const aggregatingEvent of aggregatingEvents) {
            await aggregateByEvent({ checkGates: checkGates, event: aggregatingEvent })(repos);
        }
        debug('aggregated', aggregatingEvents.map((e) => e.id));
    };
}

/**
 * イベント指定で集計する
 */
// tslint:disable-next-line:max-func-body-length
function aggregateByEvent(params: {
    checkGates: factory.place.checkinGate.IPlace[];
    event: factory.performance.IPerformance;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        reservation: repository.Reservation;
        performance: repository.Performance;
    }) => {
        const checkGates = params.checkGates;
        const performance = params.event;

        // 予約情報取得
        const reservations = await repos.reservation.search(
            {
                typeOf: factory.chevre.reservationType.EventReservation,
                reservationStatuses: [factory.chevre.reservationStatusType.ReservationConfirmed],
                reservationFor: { id: performance.id }
            },
            // 集計作業はデータ量次第で時間コストを気にする必要があるので、必要なフィールドのみ取得
            {
                checkins: 1,
                // ticket_ttts_extension: 1,
                // reservationFor: 1,
                reservedTicket: 1
            }
        );
        debug(reservations.length, 'reservations found');

        debug('creating aggregation...');
        let aggregation: factory.performance.IPerformanceWithAggregation;

        try {
            // Chevreでイベント取得
            const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: performance.id });

            const {
                maximumAttendeeCapacity,
                remainingAttendeeCapacity,
                remainingAttendeeCapacityForWheelchair
            } = await aggregateRemainingAttendeeCapacity({ event })();

            // オファーリストをchevreで検索
            const offers = await eventService.searchTicketOffers({
                event: { id: performance.id },
                seller: {
                    typeOf: <cinerinoapi.factory.organizationType>event.offers?.seller?.typeOf,
                    id: <string>event.offers?.seller?.id
                },
                store: { id: credentials.cinerino.clientId }
            });

            // let offers = (performance.ticket_type_group !== undefined) ? performance.ticket_type_group.ticket_types : undefined;
            // if (offers === undefined) {
            //     offers = [];
            // }

            // オファーごとの集計
            const offersAggregation = await Promise.all(offers.map(async (offer) => {
                const ticketTypeCategory = offer.additionalProperty?.find((p) => p.name === 'category')?.value;

                return {
                    id: <string>offer.id,
                    remainingAttendeeCapacity: (ticketTypeCategory === TicketTypeCategory.Wheelchair)
                        ? remainingAttendeeCapacityForWheelchair
                        : remainingAttendeeCapacity,
                    reservationCount: reservations.filter((r) => r.reservedTicket.ticketType.id === offer.id).length
                };
            }));

            // 入場数の集計を行う
            const checkinCountAggregation = aggregateCheckinCount(checkGates, reservations, offers);

            const tourNumber = performance.additionalProperty?.find((p) => p.name === 'tourNumber')?.value;

            aggregation = {
                id: performance.id,
                doorTime: performance.doorTime,
                startDate: performance.startDate,
                endDate: performance.endDate,
                duration: performance.duration,
                evServiceStatus: (performance.ttts_extension !== undefined)
                    ? performance.ttts_extension.ev_service_status
                    : factory.performance.EvServiceStatus.Normal,
                onlineSalesStatus: (performance.ttts_extension !== undefined)
                    ? performance.ttts_extension.online_sales_status
                    : factory.performance.OnlineSalesStatus.Normal,
                maximumAttendeeCapacity: <number>maximumAttendeeCapacity,
                remainingAttendeeCapacity: <number>remainingAttendeeCapacity,
                remainingAttendeeCapacityForWheelchair: <number>remainingAttendeeCapacityForWheelchair,
                reservationCount: reservations.length,
                checkinCount: checkinCountAggregation.checkinCount,
                reservationCountsByTicketType: offersAggregation.map((offer) => {
                    return {
                        ticketType: offer.id,
                        count: offer.reservationCount
                    };
                }),
                checkinCountsByWhere: checkinCountAggregation.checkinCountsByWhere,
                offers: offersAggregation,
                ...{ tourNumber: tourNumber } // 互換性維持のため
            };
            debug('aggregated!', aggregation);

            // パフォーマンスリポジトリにも保管
            await saveAggregation2performance(aggregation)(repos);
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error('couldn\'t create aggregation on event', performance.id, error);
        }
    };
}

/**
 * パフォーマンスコレクションに集計データを保管する
 */
function saveAggregation2performance(params: factory.performance.IPerformanceWithAggregation) {
    return async (repos: {
        performance: repository.Performance;
    }) => {
        // 値がundefinedの場合に更新しないように注意
        const update: any = {
            $set: {
                updated_at: new Date(), // $setオブジェクトが空だとMongoエラーになるので
                evServiceStatus: params.evServiceStatus,
                onlineSalesStatus: params.onlineSalesStatus,
                reservationCount: params.reservationCount,
                checkinCount: params.checkinCount,
                reservationCountsByTicketType: params.reservationCountsByTicketType,
                checkinCountsByWhere: params.checkinCountsByWhere,
                tourNumber: (<any>params).tourNumber,
                ...(typeof params.maximumAttendeeCapacity === 'number')
                    ? { maximumAttendeeCapacity: params.maximumAttendeeCapacity }
                    : undefined,
                ...(typeof params.remainingAttendeeCapacity === 'number')
                    ? { remainingAttendeeCapacity: params.remainingAttendeeCapacity }
                    : undefined,
                ...(typeof params.remainingAttendeeCapacityForWheelchair === 'number')
                    ? { remainingAttendeeCapacityForWheelchair: params.remainingAttendeeCapacityForWheelchair }
                    : undefined,
                ...(Array.isArray(params.offers)) ? { offers: params.offers } : undefined
            },
            $unset: {
                noExistingAttributeName: 1, // $unsetは空だとエラーになるので
                ...(!Array.isArray(params.offers)) ? { offers: '' } : undefined
            }
        };

        // 保管
        await repos.performance.updateOne({ _id: params.id }, update);
    };
}

/**
 * 残席数を集計する
 */
function aggregateRemainingAttendeeCapacity(params: {
    event: cinerinoapi.factory.chevre.event.screeningEvent.IEvent;
}) {
    return async () => {
        const event = params.event;
        // const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: params.performance.id });

        // Chevreのオファーごと集計を利用する場合は↓
        const aggregateOffer = event.aggregateOffer;
        const maximumAttendeeCapacity = aggregateOffer?.offers?.find((o) => o.identifier === '001')?.maximumAttendeeCapacity;
        const remainingAttendeeCapacity = aggregateOffer?.offers?.find((o) => o.identifier === '001')?.remainingAttendeeCapacity;
        const remainingAttendeeCapacityForWheelchair =
            aggregateOffer?.offers?.find((o) => o.identifier === '004')?.remainingAttendeeCapacity;

        return { maximumAttendeeCapacity, remainingAttendeeCapacity, remainingAttendeeCapacityForWheelchair };

        // const seller = event.offers?.seller;
        // if (seller === undefined) {
        //     throw new factory.errors.NotFound('Event Seller');
        // }

        // const screeningRoomSectionOffers = await eventService.searchOffers({ event: { id: event.id } });
        // const ticketOffers = await eventService.searchTicketOffers({
        //     event: { id: event.id },
        //     seller: {
        //         typeOf: <cinerinoapi.factory.organizationType>seller.typeOf,
        //         id: <string>seller.id
        //     },
        //     store: { id: credentials.cinerino.clientId }
        // });

        // const sectionOffer = screeningRoomSectionOffers[0];

        // // 一般座席
        // const normalSeats = sectionOffer.containsPlace.filter(
        //     (s) => (typeof s.seatingType === 'string' && s.seatingType === SeatingType.Normal)
        //         || (Array.isArray(s.seatingType) && s.seatingType.includes(SeatingType.Normal))
        // );
        // // 全車椅子座席
        // const wheelChairSeats = sectionOffer.containsPlace.filter(
        //     (s) => (typeof s.seatingType === 'string' && s.seatingType === SeatingType.Wheelchair)
        //         || (Array.isArray(s.seatingType) && s.seatingType.includes(SeatingType.Wheelchair))
        // );

        // // maximumAttendeeCapacityは一般座席数
        // const maximumAttendeeCapacity = normalSeats.length;
        // let remainingAttendeeCapacity = maximumAttendeeCapacity;
        // let remainingAttendeeCapacityForWheelchair = wheelChairSeats.length;

        // const availableSeatNumbers = sectionOffer.containsPlace.filter((s) => {
        //     return Array.isArray(s.offers)
        //         && s.offers.length > 0
        //         && s.offers[0]?.availability === cinerinoapi.factory.chevre.itemAvailability.InStock;
        // }).map((s) => s.branchCode);
        // debug('availableSeatNumbers:', availableSeatNumbers.length);

        // remainingAttendeeCapacity = normalSeats.filter((s) => availableSeatNumbers.includes(s.branchCode)).length;
        // remainingAttendeeCapacityForWheelchair = wheelChairSeats.filter((s) => availableSeatNumbers.includes(s.branchCode)).length;

        // // 車椅子確保分が一般座席になければ車椅子は0(同伴者考慮)
        // if (remainingAttendeeCapacity < WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS + 1) {
        //     remainingAttendeeCapacityForWheelchair = 0;
        // }

        // // 流入制限保持者がいれば車椅子在庫は0
        // const wheelChairOffer = ticketOffers.find((o) => {
        //     const ticketTypeCategory = o.additionalProperty?.find((p) => p.name === 'category')?.value;

        //     return ticketTypeCategory === TicketTypeCategory.Wheelchair;
        // });
        // if (wheelChairOffer?.availability === factory.chevre.itemAvailability.OutOfStock) {
        //     remainingAttendeeCapacityForWheelchair = 0;
        // }

        // return { maximumAttendeeCapacity, remainingAttendeeCapacity, remainingAttendeeCapacityForWheelchair };
    };
}

/**
 * 入場数の集計を行う
 */
function aggregateCheckinCount(
    checkinGates: factory.place.checkinGate.IPlace[],
    reservations: factory.reservation.event.IReservation[],
    offers: cinerinoapi.factory.chevre.event.screeningEvent.ITicketOffer[]
): {
    checkinCount: number;
    checkinCountsByWhere: factory.performance.ICheckinCountByWhere[];
} {
    // 全予約の入場履歴をマージ
    const allUniqueCheckins: factory.performance.ICheckinWithTicketType[] = reservations.reduce(
        (a, b) => {
            const ticketTypeCategory = <string>b.reservedTicket.ticketType.additionalProperty?.find((p) => p.name === 'category')?.value;

            // 同一ポイントでの重複チェックインを除外
            // チェックポイントに現れた物理的な人数を数えるのが目的なのでチェックイン行為の重複を場外
            const checkinWheres = b.checkins.map((c) => c.where);
            const uniqueCheckins = b.checkins
                .filter((c, pos) => checkinWheres.indexOf(c.where) === pos)
                .map((c) => {
                    return {
                        ...c,
                        ticketType: <string>b.reservedTicket.ticketType.id,
                        ticketCategory: ticketTypeCategory
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
                const ticketTypeCategory = <string>offer.additionalProperty?.find((p) => p.name === 'category')?.value;

                return {
                    ticketType: <string>offer.id,
                    ticketCategory: ticketTypeCategory,
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
