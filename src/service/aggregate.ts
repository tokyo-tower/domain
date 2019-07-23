/**
 * 集計サービス
 * このサービスは集計後の責任は負わないこと。
 */
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as chevre from '../chevre';
import * as repository from '../repository';

import * as Report4SalesService from './aggregate/report4sales';

import { credentials } from '../credentials';

const debug = createDebug('ttts-domain:service');

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

const EVENT_AGGREGATION_EXPIRES_IN_SECONDS = (process.env.EVENT_AGGREGATION_EXPIRES_IN_SECONDS !== undefined)
    ? Number(process.env.EVENT_AGGREGATION_EXPIRES_IN_SECONDS)
    // tslint:disable-next-line:no-magic-numbers
    : 86400;

const WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS = (process.env.WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS !== undefined)
    ? Number(process.env.WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS)
    // tslint:disable-next-line:no-magic-numbers
    : 6;

const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;

const chevreAuthClient = new chevre.auth.ClientCredentials({
    domain: credentials.chevre.authorizeServerDomain,
    clientId: credentials.chevre.clientId,
    clientSecret: credentials.chevre.clientSecret,
    scopes: [],
    state: ''
});

export {
    Report4SalesService as report4sales
};

/**
 * 特定のイベントに関する集計を行う
 */
// tslint:disable-next-line:max-func-body-length
export function aggregateEventReservations(params: {
    id: string;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        checkinGate: repository.place.CheckinGate;
        eventWithAggregation: repository.EventWithAggregation;
        performance: repository.Performance;
        project: repository.Project;
        reservation: repository.Reservation;
        ticketTypeCategoryRateLimit: repository.rateLimit.TicketTypeCategory;
    }) => {
        const performance = await repos.performance.findById(params.id);
        debug('performance', performance.id, 'found');

        // 予約情報取得
        const reservations = await repos.reservation.search(
            {
                typeOf: factory.reservationType.EventReservation,
                reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                reservationFor: { id: performance.id },
                additionalProperty: {
                    $nin: [{ name: 'extra', value: '1' }]
                }
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

        // 入場ゲート取得
        const checkGates = await repos.checkinGate.findAll();
        debug(checkGates.length, 'checkGates found');

        debug('creating aggregation...');
        let aggregation: factory.performance.IPerformanceWithAggregation;

        try {
            const {
                maximumAttendeeCapacity,
                remainingAttendeeCapacity,
                remainingAttendeeCapacityForWheelchair
            } = await aggregateRemainingAttendeeCapacity({ performance: performance, project: project })(repos);

            let offers = performance.ticket_type_group.ticket_types;
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
                    id: offer.id,
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
                evServiceStatus: performance.ttts_extension.ev_service_status,
                onlineSalesStatus: performance.ttts_extension.online_sales_status,
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
    return async (repos: {
        project: repository.Project;
        ticketTypeCategoryRateLimit: repository.rateLimit.TicketTypeCategory;
    }) => {
        const projectDetails = await repos.project.findById({ id: params.project.id });
        if (projectDetails.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (projectDetails.settings.chevre === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const eventService = new chevre.service.Event({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: chevreAuthClient
        });

        const screeningRoomSectionOffers = await eventService.searchOffers({ id: params.performance.id });
        const sectionOffer = screeningRoomSectionOffers[0];

        // maximumAttendeeCapacityは一般座席数
        const maximumAttendeeCapacity = sectionOffer.containsPlace.filter(
            (p) => {
                return p.seatingType !== undefined
                    && <any>(p.seatingType.typeOf) === factory.place.movieTheater.SeatingType.Normal;
            }
        ).length;
        let remainingAttendeeCapacity = maximumAttendeeCapacity;
        let remainingAttendeeCapacityForWheelchair = 1;

        try {
            // まず利用可能な座席は全座席
            const availableSeats = sectionOffer.containsPlace.map((p) => {
                return {
                    branchCode: p.branchCode,
                    seatingType: <factory.place.movieTheater.ISeatingType><unknown>p.seatingType
                };
            });

            // 一般座席
            const normalSeats = availableSeats.filter(
                (s) => s.seatingType.typeOf === factory.place.movieTheater.SeatingType.Normal
            );
            // 全車椅子座席
            const wheelChairSeats = availableSeats.filter(
                (s) => s.seatingType.typeOf === factory.place.movieTheater.SeatingType.Wheelchair
            );

            const seats = sectionOffer.containsPlace;
            const unavailableSeats = seats.filter((s) => {
                return Array.isArray(s.offers)
                    && s.offers.length > 0
                    && s.offers[0].availability === chevre.factory.itemAvailability.OutOfStock;
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
            let rateLimitHolder: string | null;
            if (WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS > 0) {
                rateLimitHolder = await repos.ticketTypeCategoryRateLimit.getHolder({
                    performanceStartDate: moment(params.performance.startDate).toDate(),
                    ticketTypeCategory: factory.ticketTypeCategory.Wheelchair,
                    unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                });
                debug('rateLimitHolder:', rateLimitHolder);
                if (rateLimitHolder !== null) {
                    remainingAttendeeCapacityForWheelchair = 0;
                }
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
    offers: factory.offer.seatReservation.ITicketType[]
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
                        ticketType: b.reservedTicket.ticketType.id,
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
                    ticketType: offer.id,
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
