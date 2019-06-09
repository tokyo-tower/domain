/**
 * 集計サービス
 * このサービスは集計後の責任は負わないこと。
 */
import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

// import { IAvailabilitiesByTicketType } from '../repo/itemAvailability/seatReservationOffer';
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

export {
    Report4SalesService as report4sales
};

/**
 * 特定のイベントに関する集計を行う
 */
export function aggregateEventReservations(params: {
    id: string;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        checkinGate: repository.place.CheckinGate;
        eventWithAggregation: repository.EventWithAggregation;
        performance: repository.Performance;
        reservation: repository.Reservation;
        stock: repository.Stock;
        ticketTypeCategoryRateLimit: repository.rateLimit.TicketTypeCategory;
    }) => {
        const performance = await repos.performance.findById(params.id);
        debug(performance.id, 'found');

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
                screen: 1,
                ticket_type: 1,
                ticket_ttts_extension: 1
            }
        );
        debug(reservations.length, 'reservations found.');

        // 入場ゲート取得
        const checkGates = await repos.checkinGate.findAll();
        debug(checkGates.length, 'checkGates found.');

        // パフォーマンスごとに集計
        debug('creating aggregations...');
        let aggregation: factory.performance.IPerformanceWithAggregation;

        try {
            let remainingAttendeeCapacity = MAXIMUM_ATTENDEE_CAPACITY;
            let remainingAttendeeCapacityForWheelchair = 1;

            let offers = performance.ticket_type_group.ticket_types;
            if (offers === undefined) {
                offers = [];
            }

            try {
                const section = performance.screen.sections[0];

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

                const unavailableSeats = await repos.stock.findUnavailableOffersByEventId({ eventId: performance.id });
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
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            // 券種ごとにavailabilityを作成する
            const performanceStartDate = moment(performance.start_date).toDate();

            // オファーごとの集計
            const offersAggregation = await Promise.all(offers.map(async (offer) => {
                // 基本は、座席タイプの在庫数
                let remainingAttendeeCapacity4offer: number = (offer.ttts_extension.category === factory.ticketTypeCategory.Wheelchair)
                    ? remainingAttendeeCapacityForWheelchair
                    : remainingAttendeeCapacity;

                // 流入制限ありの場合は、そちらを考慮して在庫数を上書き
                if (offer.rate_limit_unit_in_seconds > 0) {
                    try {
                        const rateLimitKey = {
                            performanceStartDate: performanceStartDate,
                            ticketTypeCategory: offer.ttts_extension.category,
                            unitInSeconds: offer.rate_limit_unit_in_seconds
                        };
                        const rateLimitHolder = await repos.ticketTypeCategoryRateLimit.getHolder(rateLimitKey);

                        // 流入制限保持者がいない、かつ、在庫必要数あれば、在庫数は固定で1、いれば0
                        remainingAttendeeCapacity4offer = (rateLimitHolder === null && remainingAttendeeCapacity4offer > 0) ? 1 : 0;
                    } catch (error) {
                        // tslint:disable-next-line:no-console
                        console.error(error);
                    }
                }

                return {
                    id: offer.id,
                    remainingAttendeeCapacity: remainingAttendeeCapacity4offer,
                    reservationCount: reservations.filter((r) => r.ticket_type === offer.id).length
                };
            }));

            // 本来、この時点で券種ごとに在庫を取得しているので情報としては十分だが、
            // 以前の仕様との互換性を保つために、車椅子の在庫フィールドだけ特別に作成する
            const wheelchairOffers = offers.filter((o) => o.ttts_extension.category === factory.ticketTypeCategory.Wheelchair);
            wheelchairOffers.forEach((offer) => {
                // この券種の残席数
                const offerAvailability = offersAggregation.find((r) => r.id === offer.id);

                // 車椅子カテゴリーの券種に在庫がひとつでもあれば、wheelchairAvailableは在庫あり。
                if (offerAvailability !== undefined && offerAvailability.remainingAttendeeCapacity > 0) {
                    remainingAttendeeCapacityForWheelchair = offerAvailability.remainingAttendeeCapacity;
                }

                // 車椅子券種の場合、同伴者必須を考慮して、そもそもremainingAttendeeCapacityが0であれば0
                if (remainingAttendeeCapacity < 1) {
                    remainingAttendeeCapacityForWheelchair = 0;
                }
            });

            // 券種ごと(販売情報ごと)の予約数を集計
            const reservationCountsByTicketType = offersAggregation.map((offer) => {
                return {
                    ticketType: offer.id,
                    count: offer.reservationCount
                };
            });

            // 入場数の集計を行う
            const checkinCountAggregation = await aggregateCheckinCount(checkGates, reservations, offers);

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
                reservationCountsByTicketType: reservationCountsByTicketType,
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
