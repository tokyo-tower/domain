/**
 * パフォーマンスサービス
 * @namespace service.performance
 */

import * as createDebug from 'debug';

import * as factory from '../factory';
import * as repository from '../repository';

import * as Models from '../repo/mongoose';

const debug = createDebug('ttts-domain:service:performance');

export interface ISearchConditions {
    limit?: number;
    page?: number;
    // 上映日
    day?: string;
    // 部門
    section?: string;
    // フリーワード
    words?: string;
    // この時間以降開始のパフォーマンスに絞る(timestamp milliseconds)
    startFrom?: Date;
    startThrough?: Date;
    // 劇場
    theater?: string;
    // スクリーン
    screen?: string;
    // パフォーマンスID
    performanceId?: string;
    // 車椅子チェック要求
    wheelchair?: string;
}

export interface IMultilingualString {
    en: string;
    ja: string;
    kr: string;
}

export interface IPerformance {
    id: string;
    attributes: {
        day: string;
        open_time: string;
        start_time: string;
        end_time: string;
        seat_status: string;
        // theater_name: IMultilingualString;
        // screen_name: IMultilingualString;
        // film: string;
        // film_name: IMultilingualString;
        // film_sections: string[];
        // film_minutes: number;
        // film_copyright: string;
        // film_image: string;
        tour_number: string;
        wheelchair_available: number;
        online_sales_status: factory.performance.OnlineSalesStatus;
        ev_service_status: factory.performance.EvServiceStatus;
        ticket_types: ITicketTypeWithAvailability[]
    };
}

export type ITicketTypeWithAvailability = factory.performance.ITicketType & {
    available_num: number
};

export interface ISearchResult {
    performances: IPerformance[];
    numberOfPerformances: number;
    filmIds: string[];
    // salesSuspended: any[];
}

export type ISearchOperation<T> = (
    performanceRepo: repository.Performance,
    performanceStatusesRepo: repository.PerformanceStatuses,
    seatReservationOfferAvailabilityRepo: repository.itemAvailability.SeatReservationOffer
) => Promise<T>;

/**
 * 検索する
 * @param {ISearchConditions} searchConditions 検索条件
 * @return {ISearchOperation<ISearchResult>} 検索結果
 * @memberof service.performance
 */
export function search(searchConditions: ISearchConditions): ISearchOperation<ISearchResult> {
    // tslint:disable-next-line:max-func-body-length
    return async (
        performanceRepo: repository.Performance,
        performanceStatusesRepo: repository.PerformanceStatuses,
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

        // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
        const fields = 'day open_time start_time end_time film screen screen_name theater theater_name ttts_extension';

        const page = (searchConditions.page !== undefined) ? searchConditions.page : 1;
        // tslint:disable-next-line:no-magic-numbers
        const limit = (searchConditions.limit !== undefined) ? searchConditions.limit : 1000;

        const performances = await performanceRepo.performanceModel.find(conditions, fields)
            .populate('film screen theater')
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
        const performanceStatuses = await performanceStatusesRepo.find();
        debug('performanceStatuses found.', performanceStatuses);

        const data: IPerformance[] = await Promise.all(performances.map(async (performance) => {
            const offerAvailabilities = await seatReservationOfferAvailabilityRepo.findByPerformance(performance.id);
            debug('offerAvailabilities:', offerAvailabilities);
            const ticketTypes = performance.ticket_type_group.ticket_types;

            // 本来、この時点で券種ごとに在庫を取得しているので情報としては十分だが、
            // 以前の仕様との互換性を保つために、車椅子の在庫フィールドだけ特別に作成する
            debug('check wheelchair availability...');
            const wheelchairTicketTypeIds = ticketTypes.filter((t) => t.ttts_extension.category === factory.ticketTypeCategory.Wheelchair)
                .map((t) => t.id);
            let wheelchairAvailable = 0;
            wheelchairTicketTypeIds.forEach((ticketTypeId) => {
                // 車椅子カテゴリーの券種に在庫がひとつでもあれば、wheelchairAvailableは在庫あり。
                if (offerAvailabilities[ticketTypeId] !== undefined && offerAvailabilities[ticketTypeId] > 0) {
                    wheelchairAvailable = offerAvailabilities[ticketTypeId];
                }
            });

            return {
                id: performance.id,
                attributes: {
                    day: performance.day,
                    open_time: performance.open_time,
                    start_time: performance.start_time,
                    end_time: performance.end_time,
                    seat_status: performanceStatuses.getStatus(performance.id),
                    // theater_name: performance.theater_name,
                    // screen_name: performance.screen_name,
                    // film: performance.film._id,
                    // film_name: performance.film.name,
                    // film_sections: performance.film.sections.map((filmSection: any) => filmSection.name),
                    // film_minutes: performance.film.minutes,
                    // film_copyright: performance.film.copyright,
                    // film_image: `${process.env.FRONTEND_ENDPOINT}/images/film/${performance.film._id}.jpg`,
                    wheelchair_available: wheelchairAvailable,
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
