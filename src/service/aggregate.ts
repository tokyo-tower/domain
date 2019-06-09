/**
 * 集計サービス
 * このサービスは集計後の責任は負わないこと。
 */
import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as repository from '../repository';

import * as Report4SalesService from './aggregate/report4sales';

const debug = createDebug('ttts-domain:service');

const EVENT_AGGREGATION_EXPIRES_IN_SECONDS = (process.env.EVENT_AGGREGATION_EXPIRES_IN_SECONDS !== undefined)
    ? Number(process.env.EVENT_AGGREGATION_EXPIRES_IN_SECONDS)
    // tslint:disable-next-line:no-magic-numbers
    : 86400;

const MAXIMUM_ATTENDEE_CAPACITY = (process.env.MAXIMUM_ATTENDEE_CAPACITY !== undefined)
    ? Number(process.env.MAXIMUM_ATTENDEE_CAPACITY)
    // tslint:disable-next-line:no-magic-numbers
    : 41;

const WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS = (process.env.WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS !== undefined)
    ? Number(process.env.WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS)
    // tslint:disable-next-line:no-magic-numbers
    : 6;

const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;

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
        checkinGate: repository.place.CheckinGate;
        eventWithAggregation: repository.EventWithAggregation;
        performance: repository.Performance;
        reservation: repository.Reservation;
        stock: repository.Stock;
        ticketTypeCategoryRateLimit: repository.rateLimit.TicketTypeCategory;
    }) => {
        const performance = await repos.performance.findById(params.id);
        debug('performance', performance.id, 'found');

        // 予約情報取得
        const reservations = await repos.reservation.search(
            {
                performance: performance.id,
                status: factory.reservationStatusType.ReservationConfirmed
            },
            // 集計作業はデータ量次第で時間コストを気にする必要があるので、必要なフィールドのみ取得
            {
                performance: 1,
                checkins: 1,
                ticket_type: 1,
                ticket_ttts_extension: 1
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
                remainingAttendeeCapacity,
                remainingAttendeeCapacityForWheelchair
            } = await aggregateRemainingAttendeeCapacity({ performance: performance })(repos);

            let offers = performance.ticket_type_group.ticket_types;
            if (offers === undefined) {
                offers = [];
            }

            // オファーごとの集計
            const offersAggregation = await Promise.all(offers.map(async (offer) => {
                return {
                    id: offer.id,
                    remainingAttendeeCapacity: (offer.ttts_extension.category === factory.ticketTypeCategory.Wheelchair)
                        ? remainingAttendeeCapacityForWheelchair
                        : remainingAttendeeCapacity,
                    reservationCount: reservations.filter((r) => r.ticket_type === offer.id).length
                };
            }));

            // 入場数の集計を行う
            const checkinCountAggregation = aggregateCheckinCount(checkGates, reservations, offers);

            aggregation = {
                id: performance.id,
                doorTime: performance.door_time,
                startDate: performance.start_date,
                endDate: performance.end_date,
                duration: performance.duration,
                tourNumber: performance.tour_number,
                evServiceStatus: performance.ttts_extension.ev_service_status,
                onlineSalesStatus: performance.ttts_extension.online_sales_status,
                maximumAttendeeCapacity: MAXIMUM_ATTENDEE_CAPACITY,
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
                offers: offersAggregation
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
}) {
    return async (repos: {
        stock: repository.Stock;
        ticketTypeCategoryRateLimit: repository.rateLimit.TicketTypeCategory;
    }) => {
        let remainingAttendeeCapacity = MAXIMUM_ATTENDEE_CAPACITY;
        let remainingAttendeeCapacityForWheelchair = 1;

        try {
            const section = params.performance.screen.sections[0];

            // まず利用可能な座席は全座席
            const availableSeats = section.seats;

            // 一般座席
            const normalSeats = availableSeats.filter(
                (s) => s.seatingType.typeOf === factory.place.movieTheater.SeatingType.Normal
            );
            // 全車椅子座席
            const wheelChairSeats = availableSeats.filter(
                (s) => s.seatingType.typeOf === factory.place.movieTheater.SeatingType.Wheelchair
            );

            const unavailableSeats = await repos.stock.findUnavailableOffersByEventId({ eventId: params.performance.id });
            const unavailableSeatNumbers = unavailableSeats.map((s) => s.seatNumber);
            debug('unavailableSeatNumbers:', unavailableSeatNumbers.length);

            // 確保済の車椅子座席
            const unavailableWheelChairSeatCount = wheelChairSeats.filter(
                (s) => unavailableSeatNumbers.indexOf(s.code) >= 0
            ).length;

            remainingAttendeeCapacity = normalSeats.filter(
                (s) => unavailableSeatNumbers.indexOf(s.code) < 0
            ).length;
            remainingAttendeeCapacityForWheelchair = wheelChairSeats.filter(
                (s) => unavailableSeatNumbers.indexOf(s.code) < 0
            ).length;

            // 車椅子の確保分を考慮(現状車椅子在庫は1のケースのみ)
            if (unavailableWheelChairSeatCount > 0) {
                remainingAttendeeCapacity -= WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS;
            }

            // 車椅子確保分が一般座席になければ車椅子は0(同伴者考慮)
            if (remainingAttendeeCapacity < WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS + 1) {
                remainingAttendeeCapacityForWheelchair = 0;
            }

            // 流入制限保持者がいれば車椅子在庫は0
            let rateLimitHolder: string | null;
            if (WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS > 0) {
                rateLimitHolder = await repos.ticketTypeCategoryRateLimit.getHolder({
                    performanceStartDate: moment(params.performance.start_date).toDate(),
                    ticketTypeCategory: factory.ticketTypeCategory.Wheelchair,
                    unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                });
                debug('rateLimitHolder:', rateLimitHolder);
                if (rateLimitHolder !== null) {
                    remainingAttendeeCapacityForWheelchair = 0;
                }
            }

            // 車椅子券種の場合、同伴者必須を考慮して、そもそもremainingAttendeeCapacityが0であれば0
            if (remainingAttendeeCapacity < 1) {
                remainingAttendeeCapacityForWheelchair = 0;
            }
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }

        return { remainingAttendeeCapacity, remainingAttendeeCapacityForWheelchair };
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
            // 同一ポイントでの重複チェックインを除外
            // チェックポイントに現れた物理的な人数を数えるのが目的なのでチェックイン行為の重複を場外
            const checkinWheres = b.checkins.map((c) => c.where);
            const uniqueCheckins = b.checkins
                .filter((c, pos) => checkinWheres.indexOf(c.where) === pos)
                .map((c) => {
                    return {
                        ...c,
                        ticketType: b.ticket_type,
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
