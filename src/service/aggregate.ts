/**
 * 集計サービス
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as repository from '../repository';

import { credentials } from '../credentials';

const debug = createDebug('ttts-domain:service');

/**
 * 入場ゲートインターフェース
 */
// export interface ICheckinGate {
//     /**
//      * 識別子
//      */
//     identifier: string;
//     /**
//      * ゲート名
//      */
//     name: string;
// }

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: credentials.cinerino.authorizeServerDomain,
    clientId: credentials.cinerino.clientId,
    clientSecret: credentials.cinerino.clientSecret,
    scopes: [],
    state: ''
});

const eventService = new cinerinoapi.service.Event({
    endpoint: credentials.cinerino.endpoint,
    auth: cinerinoAuthClient,
    project: { id: <string>process.env.PROJECT_ID }
});

// const placeService = new cinerinoapi.service.Place({
//     endpoint: credentials.cinerino.endpoint,
//     auth: cinerinoAuthClient,
//     project: { id: <string>process.env.PROJECT_ID }
// });

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
        const event = await eventService.findById<factory.chevre.eventType.ScreeningEvent>({ id: params.id });
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
        // const searchMovieTheatersResult =
        //     await placeService.searchMovieTheaters({ branchCodes: [event.superEvent.location.branchCode] });
        // const movieTheater = searchMovieTheatersResult.data.shift();
        // if (movieTheater === undefined) {
        //     throw new factory.errors.NotFound('MovieTheater');
        // }

        // let checkGates: ICheckinGate[] = [];
        // if (Array.isArray(movieTheater.hasEntranceGate)) {
        //     checkGates = movieTheater.hasEntranceGate.map((g) => {
        //         return {
        //             identifier: String(g.identifier),
        //             name: (typeof g.name === 'string') ? g.name : String(g.name?.ja)
        //         };
        //     });
        // }
        // debug(checkGates.length, 'checkGates found');

        for (const aggregatingEvent of aggregatingEvents) {
            // await aggregateByEvent({ checkGates: checkGates, event: aggregatingEvent })(repos);
            await aggregateByEvent({ event: aggregatingEvent })(repos);
        }
        debug('aggregated', aggregatingEvents.map((e) => e.id));
    };
}

/**
 * イベント指定で集計する
 */
function aggregateByEvent(params: {
    // checkGates: ICheckinGate[];
    event: factory.performance.IPerformance;
}) {
    return async (repos: {
        reservation: repository.Reservation;
        performance: repository.Performance;
    }) => {
        // const checkGates = params.checkGates;

        // 予約情報取得
        const reservations = await repos.reservation.search(
            {
                typeOf: factory.chevre.reservationType.EventReservation,
                reservationStatuses: [factory.chevre.reservationStatusType.ReservationConfirmed],
                reservationFor: { id: params.event.id }
            },
            // 集計作業はデータ量次第で時間コストを気にする必要があるので、必要なフィールドのみ取得
            {
                checkins: 1,
                reservedTicket: 1,
                underName: 1
            }
        );
        debug(reservations.length, 'reservations found');

        debug('creating aggregation...');
        let aggregation: factory.performance.IPerformanceAggregation;

        try {
            // Chevreでイベント取得
            // const event = await eventService.findById<factory.chevre.eventType.ScreeningEvent>({ id: params.event.id });

            // 入場数の集計を行う
            // const checkinCountAggregation = aggregateCheckinCount(checkGates, reservations, event);

            // イベントステータス最終更新時の予約について未入場数を算出する
            const { checkedReservations } = aggregateUncheckedReservations(reservations);

            aggregation = {
                id: params.event.id
                // aggregateEntranceGate: event.aggregateEntranceGate,
                // aggregateOffer: event.aggregateOffer,
                // aggregateReservation: event.aggregateReservation,
                // checkinCount: checkinCountAggregation.checkinCount,
                // checkinCountsByWhere: checkinCountAggregation.checkinCountsByWhere
            };
            debug('aggregated!', aggregation);

            // パフォーマンスリポジトリに保管
            await saveAggregation2performance(aggregation, checkedReservations)(repos);
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error('couldn\'t create aggregation on event', params.event.id, error);
        }
    };
}

/**
 * パフォーマンスコレクションに集計データを保管する
 */
function saveAggregation2performance(
    params: factory.performance.IPerformanceAggregation,
    checkedReservations: factory.reservation.event.IReservation[]
) {
    return async (repos: {
        performance: repository.Performance;
    }) => {
        // 値がundefinedの場合に更新しないように注意
        const update: any = {
            $set: {
                updated_at: new Date(), // $setオブジェクトが空だとMongoエラーになるので
                ...(typeof params.checkinCount === 'number')
                    ? { checkinCount: params.checkinCount }
                    : undefined,
                ...(Array.isArray(params.checkinCountsByWhere))
                    ? { checkinCountsByWhere: params.checkinCountsByWhere }
                    : undefined,
                ...(Array.isArray(params.aggregateOffer?.offers))
                    ? { aggregateOffer: params.aggregateOffer }
                    : undefined,
                ...(typeof params.aggregateReservation?.typeOf === 'string')
                    ? { aggregateReservation: params.aggregateReservation }
                    : undefined,
                ...(Array.isArray(params.aggregateEntranceGate?.places))
                    ? { aggregateEntranceGate: params.aggregateEntranceGate }
                    : undefined,
                'ttts_extension.checkedReservations': checkedReservations.map((r) => {
                    return {
                        id: r.id,
                        underName: r.underName
                    };
                })
            },
            $unset: {
                noExistingAttributeName: 1 // $unsetは空だとエラーになるので
            }
        };

        // 保管
        await repos.performance.updateOne({ _id: params.id }, update);
    };
}

/**
 * 入場数の集計を行う
 */
// function aggregateCheckinCount(
//     checkinGates: ICheckinGate[],
//     reservations: factory.reservation.event.IReservation[],
//     event: factory.performance.IPerformance
// ): {
//     checkinCount: number;
//     checkinCountsByWhere: factory.performance.ICheckinCountByWhere[];
// } {
//     // 全予約の入場履歴をマージ
//     const allUniqueCheckins: factory.performance.ICheckinWithTicketType[] = reservations.reduce(
//         (a, b) => {
//             const ticketTypeCategory = <string>b.reservedTicket.ticketType.category?.codeValue;

//             // 同一ポイントでの重複チェックインを除外
//             // チェックポイントに現れた物理的な人数を数えるのが目的なのでチェックイン行為の重複を場外
//             const checkinWheres = b.checkins.map((c) => c.where);
//             const uniqueCheckins = b.checkins
//                 .filter((c, pos) => checkinWheres.indexOf(c.where) === pos)
//                 .map((c) => {
//                     return {
//                         ...c,
//                         ticketType: <string>b.reservedTicket.ticketType.id,
//                         ticketCategory: ticketTypeCategory
//                     };
//                 });

//             return [...a, ...uniqueCheckins];
//         },
//         []
//     );

//     const offers = event.aggregateOffer?.offers;

//     // 入場ゲートごとに、券種ごとの入場者数を算出する
//     const checkinCountsByWhere = checkinGates.map((checkinGate) => {
//         // この入場ゲートの入場履歴
//         const uniqueCheckins4where = allUniqueCheckins.filter((c) => c.where === checkinGate.identifier);

//         return {
//             where: checkinGate.identifier,
//             // checkinCountsByTicketType: offers.map((offer) => {
//             checkinCountsByTicketType: (Array.isArray(offers))
//                 ? offers.map((offer) => {
//                     return {
//                         ticketType: <string>offer.id,
//                         ticketCategory: <string>offer.category?.codeValue,
//                         // この券種の入場履歴数を集計
//                         count: uniqueCheckins4where.filter((c) => c.ticketType === offer.id).length
//                     };
//                 })
//                 : []
//         };
//     });

//     return {
//         checkinCount: allUniqueCheckins.length,
//         checkinCountsByWhere: checkinCountsByWhere
//     };
// }

function aggregateUncheckedReservations(reservations: factory.reservation.event.IReservation[]) {
    let checkedReservations: factory.reservation.event.IReservation[] = [];

    // 入場予約を検索
    checkedReservations = reservations
        .filter((r) => r.checkins.length > 0);

    return {
        checkedReservations
    };
}
