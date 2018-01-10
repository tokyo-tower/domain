/**
 * パフォーマンスサービス
 * @namespace service.performance
 */

import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';

import * as Models from '../repo/mongoose';
import * as repository from '../repository';

const debug = createDebug('ttts-domain:service:performance');

export interface ISearchResult {
    performances: factory.performance.IPerformanceWithAvailability[];
    numberOfPerformances: number;
    filmIds: string[];
}

export type ISearchOperation<T> = (
    performanceRepo: repository.Performance,
    performanceAvailabilityRepo: repository.itemAvailability.Performance,
    seatReservationOfferAvailabilityRepo: repository.itemAvailability.SeatReservationOffer
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
        performanceAvailabilityRepo: repository.itemAvailability.Performance,
        seatReservationOfferAvailabilityRepo: repository.itemAvailability.SeatReservationOffer
    ) => {
        // MongoDB検索条件を作成
        const andConditions: any[] = [
            { canceled: false }
        ];

        if (searchConditions.day !== undefined) {
            andConditions.push({ day: searchConditions.day });
        }

        if (searchConditions.theater !== undefined) {
            andConditions.push({ theater: searchConditions.theater });
        }

        if (searchConditions.screen !== undefined) {
            andConditions.push({ screen: searchConditions.screen });
        }

        if (searchConditions.performanceId !== undefined) {
            andConditions.push({ _id: searchConditions.performanceId });
        }

        // 開始日時条件
        if (searchConditions.startFrom !== undefined) {
            andConditions.push({
                start_date: { $gte: searchConditions.startFrom }
            });
        }
        if (searchConditions.startThrough !== undefined) {
            andConditions.push({
                start_date: { $lt: searchConditions.startThrough }
            });
        }

        // 作品条件を追加する
        await addFilmConditions(
            andConditions,
            (searchConditions.section !== undefined) ? searchConditions.section : null,
            (searchConditions.words !== undefined) ? searchConditions.words : null
        );

        let conditions: any = null;
        if (andConditions.length > 0) {
            conditions = { $and: andConditions };
        }
        debug('search conditions;', conditions);

        // 作品件数取得
        const filmIds = await performanceRepo.performanceModel.distinct('film', conditions).exec();

        // 総数検索
        const performancesCount = await performanceRepo.performanceModel.count(conditions).exec();

        const page = (searchConditions.page !== undefined) ? searchConditions.page : 1;
        // tslint:disable-next-line:no-magic-numbers
        const limit = (searchConditions.limit !== undefined) ? searchConditions.limit : 1000;

        const performances = await performanceRepo.performanceModel.find(conditions, '')
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .skip(limit * (page - 1)).limit(limit)
            // 上映日、開始時刻
            .setOptions({
                sort: {
                    day: 1,
                    start_time: 1
                }
            })
            .exec().then((docs) => docs.map((doc) => <factory.performance.IPerformanceWithDetails>doc.toObject()));
        debug('performances found.', performances);

        // 空席情報を追加
        const performanceAvailabilities = await performanceAvailabilityRepo.findAll();
        debug('performanceAvailabilities found.', performanceAvailabilities);

        const data: factory.performance.IPerformanceWithAvailability[] = await Promise.all(performances.map(async (performance) => {
            const offerAvailabilities = await seatReservationOfferAvailabilityRepo.findByPerformance(performance.id);
            debug('offerAvailabilities:', offerAvailabilities);
            const ticketTypes = performance.ticket_type_group.ticket_types;

            // 本来、この時点で券種ごとに在庫を取得しているので情報としては十分だが、
            // 以前の仕様との互換性を保つために、車椅子の在庫フィールドだけ特別に作成する
            debug('check wheelchair availability...');
            const wheelchairTicketTypeIds = ticketTypes.filter((t) => t.ttts_extension.category === factory.ticketTypeCategory.Wheelchair)
                .map((t) => t.id);
            let remainingAttendeeCapacityForWheelchair = 0;
            wheelchairTicketTypeIds.forEach((ticketTypeId) => {
                // 車椅子カテゴリーの券種に在庫がひとつでもあれば、wheelchairAvailableは在庫あり。
                if (offerAvailabilities[ticketTypeId] !== undefined && offerAvailabilities[ticketTypeId] > 0) {
                    remainingAttendeeCapacityForWheelchair = offerAvailabilities[ticketTypeId];
                }
            });

            return {
                id: performance.id,
                doorTime: performance.door_time,
                startDate: performance.start_date,
                endDate: performance.end_date,
                duration: performance.duration,
                tourNumber: performance.tour_number,
                evServiceStatus: performance.ttts_extension.ev_service_status,
                onlineSalesStatus: performance.ttts_extension.online_sales_status,
                // tslint:disable-next-line:no-suspicious-comment
                // TODO 値補充
                maximumAttendeeCapacity: 0,
                // tslint:disable-next-line:no-magic-numbers
                remainingAttendeeCapacity: parseInt(performanceAvailabilities[performance.id], 10),
                remainingAttendeeCapacityForWheelchair: remainingAttendeeCapacityForWheelchair,
                ticketTypes: ticketTypes.map((ticketType) => {
                    return {
                        ...ticketType,
                        ...{
                            remainingAttendeeCapacity: offerAvailabilities[ticketType.id]
                        }
                    };
                }),
                attributes: {
                    day: performance.day,
                    open_time: performance.open_time,
                    start_time: performance.start_time,
                    end_time: performance.end_time,
                    start_date: performance.start_date,
                    end_date: performance.end_date,
                    // tslint:disable-next-line:no-magic-numbers
                    seat_status: parseInt(performanceAvailabilities[performance.id], 10),
                    wheelchair_available: remainingAttendeeCapacityForWheelchair,
                    ticket_types: ticketTypes.map((ticketType) => {
                        return {
                            ...ticketType,
                            ...{
                                available_num: offerAvailabilities[ticketType.id]
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
        }));

        return {
            performances: data,
            numberOfPerformances: performancesCount,
            filmIds: filmIds
        };
    };
}

/**
 * 作品に関する検索条件を追加する
 * @param andConditions パフォーマンス検索条件
 * @param section 作品部門
 * @param words フリーワード
 */
async function addFilmConditions(andConditions: any[], section: string | null, words: string | null): Promise<void> {
    const filmAndConditions: any[] = [];
    if (section !== null) {
        // 部門条件の追加
        filmAndConditions.push({ 'sections.code': { $in: [section] } });
    }

    // フリーワードの検索対象はタイトル(日英両方)
    // 空白つなぎでOR検索
    if (words !== null) {
        // trim and to half-width space
        words = words.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
        const orConditions = words.split(' ').filter((value) => (value.length > 0)).reduce(
            (a: any[], word) => {
                return a.concat(
                    { 'name.ja': { $regex: `${word}` } },
                    { 'name.en': { $regex: `${word}` } }
                );
            },
            []
        );
        debug(orConditions);
        filmAndConditions.push({ $or: orConditions });
    }

    // 条件があれば作品検索してID条件として追加
    if (filmAndConditions.length > 0) {
        const filmIds = await Models.Film.distinct('_id', { $and: filmAndConditions }).exec();
        debug('filmIds:', filmIds);
        // 該当作品がない場合、filmIdsが空配列となりok
        andConditions.push({ film: { $in: filmIds } });
    }
}

/**
 * パフォーマンスに関する集計を行う
 * @param {ISearchConditions} searchConditions パフォーマンス検索条件
 * @param {number} ttl 集計データの保管期間(秒)
 */
export function aggregateCounts(searchConditions: factory.performance.ISearchConditions, ttl: number) {
    return async (
        checkinGateRepo: repository.place.CheckinGate,
        performanceRepo: repository.Performance,
        reservationRepo: repository.Reservation,
        performanceAvailabilityRepo: repository.itemAvailability.Performance,
        seatReservationOfferAvailabilityRepo: repository.itemAvailability.SeatReservationOffer,
        performanceWithAggregationRepo: repository.PerformanceWithAggregation
    ) => {
        // MongoDB検索条件を作成
        const andConditions: any[] = [
            { canceled: false }
        ];

        // 開始日時条件
        if (searchConditions.startFrom !== undefined) {
            andConditions.push({
                start_date: { $gte: searchConditions.startFrom }
            });
        }
        if (searchConditions.startThrough !== undefined) {
            andConditions.push({
                start_date: { $lt: searchConditions.startThrough }
            });
        }

        const performances = await performanceRepo.performanceModel.find({ $and: andConditions })
            .populate('film screen theater')
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .exec().then((docs) => docs.map((doc) => <factory.performance.IPerformanceWithDetails>doc.toObject()));
        debug('performances found,', performances.length);

        // 予約情報取得
        const reservations = await reservationRepo.reservationModel.find(
            {
                performance: { $in: performances.map((p) => p.id) },
                status: factory.reservationStatusType.ReservationConfirmed
            }
        ).exec().then((docs) => docs.map((doc) => <factory.reservation.event.IReservation>doc.toObject()));
        debug('reservations found,', reservations.length);

        // 入場ゲート取得
        const checkGates = await checkinGateRepo.findAll();
        debug('checkGates are', checkGates);

        // パフォーマンスごとの在庫状況
        const performanceAvailabilities = await performanceAvailabilityRepo.findAll();
        debug('performanceAvailabilities found.', performanceAvailabilities);

        // パフォーマンスごとに集計
        // tslint:disable-next-line:max-func-body-length
        const aggregations = await Promise.all(performances.map(async (performance) => {
            const reservations4performance = reservations.filter((r) => r.performance === performance.id);

            // 全予約数
            const totalReservationCount = reservations4performance.filter(
                (r) => (r.status === factory.reservationStatusType.ReservationConfirmed)
            ).length;

            // 場所ごとの入場情報を集計
            const checkinInfosByWhere: factory.performance.ICheckinInfosByWhere = checkGates.map((checkGate) => {
                return {
                    where: checkGate.identifier,
                    checkins: [],
                    arrivedCountsByTicketType: performance.ticket_type_group.ticket_types.map((t) => {
                        return { ticketType: t.id, ticketCategory: t.ttts_extension.category, count: 0 };
                    })
                };
            });

            reservations4performance.forEach((reservation) => {
                const tempCheckinWhereArray: string[] = [];

                reservation.checkins.forEach((checkin) => {
                    // 同一ポイントでの重複チェックインを除外
                    // ※チェックポイントに現れた物理的な人数を数えるのが目的なのでチェックイン行為の重複はここでは問題にしない
                    if (tempCheckinWhereArray.indexOf(checkin.where) >= 0) {
                        return;
                    }

                    tempCheckinWhereArray.push(checkin.where);

                    const checkinInfoByWhere = <factory.performance.ICheckinInfoByWhere>checkinInfosByWhere.find(
                        (info) => info.where === checkin.where
                    );

                    // チェックイン数セット
                    (<factory.performance.IArrivedCountByTicketType>checkinInfoByWhere.arrivedCountsByTicketType.find(
                        (c) => c.ticketType === reservation.ticket_type
                    )).count += 1;

                    // チェックイン数セット
                    checkinInfoByWhere.checkins.push({
                        ...checkin,
                        ...{
                            ticketType: reservation.ticket_type,
                            ticketCategory: reservation.ticket_ttts_extension.category
                        }
                    });
                });
            });

            // 券種ごとの予約数を集計
            const reservationCountsByTicketType = performance.ticket_type_group.ticket_types.map((t) => {
                return { ticketType: t.id, count: 0 };
            });
            reservations4performance.map((reservation) => {
                // 券種ごとの予約数をセット
                (<factory.performance.IReservationCountByTicketType>reservationCountsByTicketType.find(
                    (c) => c.ticketType === reservation.ticket_type
                )).count += 1;
            });

            const offerAvailabilities = await seatReservationOfferAvailabilityRepo.findByPerformance(performance.id);
            debug('offerAvailabilities:', offerAvailabilities);
            const ticketTypes = performance.ticket_type_group.ticket_types;

            // 本来、この時点で券種ごとに在庫を取得しているので情報としては十分だが、
            // 以前の仕様との互換性を保つために、車椅子の在庫フィールドだけ特別に作成する
            debug('check wheelchair availability...');
            const wheelchairTicketTypeIds = ticketTypes.filter((t) => t.ttts_extension.category === factory.ticketTypeCategory.Wheelchair)
                .map((t) => t.id);
            let remainingAttendeeCapacityForWheelchair = 0;
            wheelchairTicketTypeIds.forEach((ticketTypeId) => {
                // 車椅子カテゴリーの券種に在庫がひとつでもあれば、wheelchairAvailableは在庫あり。
                if (offerAvailabilities[ticketTypeId] !== undefined && offerAvailabilities[ticketTypeId] > 0) {
                    remainingAttendeeCapacityForWheelchair = offerAvailabilities[ticketTypeId];
                }
            });

            const aggregation: factory.performance.IPerformanceWithAggregation = {
                id: performance.id,
                doorTime: performance.door_time,
                startDate: performance.start_date,
                endDate: performance.end_date,
                duration: performance.duration,
                maximumAttendeeCapacity: performance.screen.sections.reduce((a, b) => a + b.seats.length, 0),
                // tslint:disable-next-line:no-magic-numbers
                remainingAttendeeCapacity: parseInt(performanceAvailabilities[performance.id], 10),
                remainingAttendeeCapacityForWheelchair: remainingAttendeeCapacityForWheelchair,
                tourNumber: performance.tour_number,
                evServiceStatus: performance.ttts_extension.ev_service_status,
                onlineSalesStatus: performance.ttts_extension.online_sales_status,
                reservationCount: totalReservationCount,
                checkinCount: checkinInfosByWhere.reduce((a, b) => a + b.checkins.length, 0),
                reservationCountsByTicketType: reservationCountsByTicketType,
                // 場所ごとに、券種ごとの入場者数初期値をセット
                checkinCountsByWhere: checkGates.map((checkGate) => {
                    return {
                        where: checkGate.identifier,
                        checkinCountsByTicketType: performance.ticket_type_group.ticket_types.map((t) => {
                            return {
                                ticketType: t.id,
                                ticketCategory: t.ttts_extension.category,
                                count: 0
                            };
                        })
                    };
                })
            };

            // 場所ごとに、券種ごとの未入場者数を算出する
            checkinInfosByWhere.forEach((checkinInfoByWhere) => {
                const checkinCountsByTicketType = <factory.performance.ICheckinCountByWhere>aggregation.checkinCountsByWhere.find(
                    (c) => c.where === checkinInfoByWhere.where
                );

                checkinInfoByWhere.checkins.forEach((checkin) => {
                    (<factory.performance.ICheckinCountsByTicketType>checkinCountsByTicketType.checkinCountsByTicketType.find(
                        (c) => c.ticketType === checkin.ticketType
                    )).count += 1;
                });
            });

            return aggregation;
        }));

        await performanceWithAggregationRepo.store(aggregations, ttl);
    };
}
