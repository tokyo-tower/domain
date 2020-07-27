/**
 * 集計サービス
 * このサービスは集計後の責任は負わないこと。
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as repository from '../repository';

import * as Report4SalesService from './aggregate/report4sales';

import { credentials } from '../credentials';

const debug = createDebug('ttts-domain:service');

const project: factory.project.IProject = {
    typeOf: cinerinoapi.factory.organizationType.Project,
    id: <string>process.env.PROJECT_ID
};

const EVENT_AGGREGATION_EXPIRES_IN_SECONDS = (process.env.EVENT_AGGREGATION_EXPIRES_IN_SECONDS !== undefined)
    ? Number(process.env.EVENT_AGGREGATION_EXPIRES_IN_SECONDS)
    // tslint:disable-next-line:no-magic-numbers
    : 86400;

const WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS = (process.env.WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS !== undefined)
    ? Number(process.env.WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS)
    // tslint:disable-next-line:no-magic-numbers
    : 6;

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: credentials.cinerino.authorizeServerDomain,
    clientId: credentials.cinerino.clientId,
    clientSecret: credentials.cinerino.clientSecret,
    scopes: [],
    state: ''
});

export {
    Report4SalesService as report4sales
};

/**
 * 特定のイベントに関する集計を行う
 */
export function aggregateEventReservations(params: {
    id: string;
}) {
    return async (repos: {
        eventWithAggregation: repository.EventWithAggregation;
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
        const placeService = new cinerinoapi.service.Place({
            endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            auth: cinerinoAuthClient,
            project: { id: project.id }
        });
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

        // 不要な集計データをクリーンアップ
        try {
            await makeAggregationsExpired()(repos);
        } catch (error) {
            // no op
        }
    };
}

function makeAggregationsExpired() {
    return async (repos: {
        eventWithAggregation: repository.EventWithAggregation;
        performance: repository.Performance;
    }) => {
        // 過去のイベントを検索
        const startThrough = moment()
            .add(-1, 'week')
            .toDate();
        const startFrom = moment(startThrough)
            .add(-1, 'week')
            .toDate();
        const eventIds = await repos.performance.distinct('_id', {
            startFrom: startFrom,
            startThrough: startThrough
        });

        if (eventIds.length > 0) {
            await repos.eventWithAggregation.deleteByIds({ ids: eventIds });
        }
    };
}

/**
 * イベント指定で集計する
 */
function aggregateByEvent(params: {
    checkGates: factory.place.checkinGate.IPlace[];
    event: factory.performance.IPerformanceWithDetails;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        eventWithAggregation: repository.EventWithAggregation;
        reservation: repository.Reservation;
    }) => {
        const checkGates = params.checkGates;
        const performance = params.event;

        // 予約情報取得
        const reservations = await repos.reservation.search(
            {
                typeOf: factory.chevre.reservationType.EventReservation,
                reservationStatuses: [factory.chevre.reservationStatusType.ReservationConfirmed],
                reservationFor: { id: performance.id }
                // additionalProperty: {
                //     $nin: [{ name: 'extra', value: '1' }]
                // }
            },
            // 集計作業はデータ量次第で時間コストを気にする必要があるので、必要なフィールドのみ取得
            {
                checkins: 1,
                ticket_ttts_extension: 1,
                reservationFor: 1,
                reservedTicket: 1
            }
        );
        debug(reservations.length, 'reservations found');

        debug('creating aggregation...');
        let aggregation: factory.performance.IPerformanceWithAggregation;

        try {
            const {
                maximumAttendeeCapacity,
                remainingAttendeeCapacity,
                remainingAttendeeCapacityForWheelchair
            } = await aggregateRemainingAttendeeCapacity({ performance: performance, project: project })(repos);

            let offers = (performance.ticket_type_group !== undefined) ? performance.ticket_type_group.ticket_types : undefined;
            if (offers === undefined) {
                offers = [];
            }

            // オファーごとの集計
            const offersAggregation = await Promise.all(offers.map(async (offer) => {
                let ticketTypeCategory = factory.ticketTypeCategory.Normal;
                if (Array.isArray(offer.additionalProperty)) {
                    const categoryProperty = offer.additionalProperty.find((p) => p.name === 'category');
                    if (categoryProperty !== undefined) {
                        ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                    }
                }

                return {
                    id: <string>offer.id,
                    remainingAttendeeCapacity: (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair)
                        ? remainingAttendeeCapacityForWheelchair
                        : remainingAttendeeCapacity,
                    reservationCount: reservations.filter((r) => r.reservedTicket.ticketType.id === offer.id).length
                };
            }));

            // 入場数の集計を行う
            const checkinCountAggregation = aggregateCheckinCount(checkGates, reservations, offers);

            let tourNumber: string = (<any>performance).tour_number; // 古いデーターに対する互換性対応
            if (performance.additionalProperty !== undefined) {
                const tourNumberProperty = performance.additionalProperty.find((p) => p.name === 'tourNumber');
                if (tourNumberProperty !== undefined) {
                    tourNumber = tourNumberProperty.value;
                }
            }

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
                maximumAttendeeCapacity: maximumAttendeeCapacity,
                remainingAttendeeCapacity: remainingAttendeeCapacity,
                remainingAttendeeCapacityForWheelchair: remainingAttendeeCapacityForWheelchair,
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

            // 保管
            await repos.eventWithAggregation.store([aggregation], EVENT_AGGREGATION_EXPIRES_IN_SECONDS);
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error('couldn\'t create aggregation on event', performance.id, error);
        }
    };
}

/**
 * 残席数を集計する
 */
function aggregateRemainingAttendeeCapacity(params: {
    performance: factory.performance.IPerformanceWithDetails;
    project: factory.project.IProject;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (__: {
    }) => {
        const eventService = new cinerinoapi.service.Event({
            endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            auth: cinerinoAuthClient,
            project: { id: params.project.id }
        });

        const event = await eventService.findById({ id: params.performance.id });
        const seller = event.offers?.seller;
        if (seller === undefined) {
            throw new factory.errors.NotFound('Event Seller');
        }

        const screeningRoomSectionOffers = await eventService.searchOffers({ event: { id: params.performance.id } });
        const ticketOffers = await eventService.searchTicketOffers({
            event: {
                id: params.performance.id
            },
            seller: {
                typeOf: <cinerinoapi.factory.organizationType>seller.typeOf,
                id: <string>seller.id
            },
            store: {
                id: credentials.cinerino.clientId
            }
        });

        const sectionOffer = screeningRoomSectionOffers[0];

        // maximumAttendeeCapacityは一般座席数
        const maximumAttendeeCapacity = sectionOffer.containsPlace.filter(
            (p) => {
                return (typeof p.seatingType === 'string' && p.seatingType === factory.place.movieTheater.SeatingType.Normal)
                    || (Array.isArray(p.seatingType) &&
                        (<any>p.seatingType).includes(<string>factory.place.movieTheater.SeatingType.Normal));
            }
        ).length;
        let remainingAttendeeCapacity = maximumAttendeeCapacity;
        let remainingAttendeeCapacityForWheelchair = 1;

        try {
            // まず利用可能な座席は全座席
            const availableSeats = sectionOffer.containsPlace.map((p) => {
                return {
                    branchCode: p.branchCode,
                    seatingType: <any><unknown>p.seatingType
                };
            });

            // 一般座席
            const normalSeats = availableSeats.filter(
                (s) => (typeof s.seatingType === 'string' && s.seatingType === factory.place.movieTheater.SeatingType.Normal)
                    || (Array.isArray(s.seatingType) &&
                        (<any>s.seatingType).includes(<string>factory.place.movieTheater.SeatingType.Normal))
            );
            // 全車椅子座席
            const wheelChairSeats = availableSeats.filter(
                (s) => (typeof s.seatingType === 'string' && s.seatingType === factory.place.movieTheater.SeatingType.Wheelchair)
                    || (Array.isArray(s.seatingType) &&
                        (<any>s.seatingType).includes(<string>factory.place.movieTheater.SeatingType.Wheelchair))
            );

            const seats = sectionOffer.containsPlace;
            const unavailableSeats = seats.filter((s) => {
                return Array.isArray(s.offers)
                    && s.offers.length > 0
                    && s.offers[0].availability === cinerinoapi.factory.chevre.itemAvailability.OutOfStock;
            }).map((s) => {
                return {
                    seatSection: sectionOffer.branchCode,
                    seatNumber: s.branchCode
                };
            });
            // const unavailableSeats = await repos.stock.findUnavailableOffersByEventId({ eventId: params.performance.id });
            const unavailableSeatNumbers = unavailableSeats.map((s) => s.seatNumber);
            debug('unavailableSeatNumbers:', unavailableSeatNumbers.length);

            remainingAttendeeCapacity = normalSeats.filter(
                (s) => unavailableSeatNumbers.indexOf(s.branchCode) < 0
            ).length;
            remainingAttendeeCapacityForWheelchair = wheelChairSeats.filter(
                (s) => unavailableSeatNumbers.indexOf(s.branchCode) < 0
            ).length;

            // 車椅子確保分が一般座席になければ車椅子は0(同伴者考慮)
            if (remainingAttendeeCapacity < WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS + 1) {
                remainingAttendeeCapacityForWheelchair = 0;
            }

            // 流入制限保持者がいれば車椅子在庫は0
            const wheelChairOffer = ticketOffers.find((o) => {
                let ticketTypeCategory = ''; // 互換性維持のため
                if (Array.isArray(o.additionalProperty)) {
                    const categoryProperty = o.additionalProperty.find((p) => p.name === 'category');
                    if (categoryProperty !== undefined) {
                        ticketTypeCategory = categoryProperty.value;
                    }
                }

                return ticketTypeCategory === factory.ticketTypeCategory.Wheelchair;
            });
            if (wheelChairOffer !== undefined && wheelChairOffer.availability === factory.chevre.itemAvailability.OutOfStock) {
                remainingAttendeeCapacityForWheelchair = 0;
            }
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }

        return { maximumAttendeeCapacity, remainingAttendeeCapacity, remainingAttendeeCapacityForWheelchair };
    };
}

/**
 * 入場数の集計を行う
 */
function aggregateCheckinCount(
    checkinGates: factory.place.checkinGate.IPlace[],
    reservations: factory.reservation.event.IReservation[],
    offers: factory.chevre.offer.IUnitPriceOffer[]
): {
    checkinCount: number;
    checkinCountsByWhere: factory.performance.ICheckinCountByWhere[];
} {
    // 全予約の入場履歴をマージ
    const allUniqueCheckins: factory.performance.ICheckinWithTicketType[] = reservations.reduce(
        (a, b) => {
            let ticketTypeCategory = ((<any>b).ticket_ttts_extension !== undefined)
                ? (<any>b).ticket_ttts_extension.category
                : ''; // 互換性維持のため
            if (Array.isArray(b.reservedTicket.ticketType.additionalProperty)) {
                const categoryProperty = b.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
                if (categoryProperty !== undefined) {
                    ticketTypeCategory = categoryProperty.value;
                }
            }

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
                let ticketTypeCategory = factory.ticketTypeCategory.Normal;
                if (Array.isArray(offer.additionalProperty)) {
                    const categoryProperty = offer.additionalProperty.find((p) => p.name === 'category');
                    if (categoryProperty !== undefined) {
                        ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                    }
                }

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
