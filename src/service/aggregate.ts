/**
 * 集計サービス
 */
// import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
// import * as moment from 'moment';

import * as repository from '../repository';

// import { credentials } from '../credentials';

const debug = createDebug('ttts-domain:service');

// const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
//     domain: credentials.cinerino.authorizeServerDomain,
//     clientId: credentials.cinerino.clientId,
//     clientSecret: credentials.cinerino.clientSecret,
//     scopes: [],
//     state: ''
// });

// const eventService = new cinerinoapi.service.Event({
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
        const event = { id: params.id };
        // const event = await eventService.findById<factory.chevre.eventType.ScreeningEvent>({ id: params.id });
        // debug('event', event.id, 'found');

        // 同日の、同時刻隊のツアーに関しても集計する(車椅子残席数が影響し合うため)
        // const startFrom = moment(event.startDate)
        //     .startOf('hour')
        //     .toDate();
        // const startThrough = moment(startFrom)
        //     .add(1, 'hour')
        //     .add(-1, 'second')
        //     .toDate();
        // debug('searching aggregating events...', startFrom, '-', startThrough);
        // const aggregatingEvents = await repos.performance.search({
        //     limit: 100,
        //     startFrom: startFrom,
        //     startThrough: startThrough
        // });
        const aggregatingEvents = [event];
        debug(aggregatingEvents.length, 'aggregatingEvents found');

        for (const aggregatingEvent of aggregatingEvents) {
            await aggregateByEvent({ event: aggregatingEvent })(repos);
        }
        debug('aggregated', aggregatingEvents.map((e) => e.id));
    };
}

/**
 * イベント指定で集計する
 */
function aggregateByEvent(params: {
    event: { id: string };
}) {
    return async (repos: {
        reservation: repository.Reservation;
        performance: repository.Performance;
    }) => {
        // 予約情報取得
        const reservations = await repos.reservation.search(
            {
                typeOf: factory.chevre.reservationType.EventReservation,
                reservationStatuses: [factory.chevre.reservationStatusType.ReservationConfirmed],
                reservationFor: { id: params.event.id }
            },
            // 集計作業はデータ量次第で時間コストを気にする必要があるので、必要なフィールドのみ取得
            {
                checkins: 1
                // reservedTicket: 1,
                // underName: 1
            }
        );
        debug(reservations.length, 'reservations found');

        try {
            // イベントステータス最終更新時の予約について未入場数を算出する
            const { checkedReservations } = aggregateUncheckedReservations(reservations);

            // パフォーマンスリポジトリに保管
            await saveAggregation2performance(params.event, checkedReservations)(repos);
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
    params: { id: string },
    checkedReservations: factory.reservation.event.IReservation[]
) {
    return async (repos: {
        performance: repository.Performance;
    }) => {
        // 値がundefinedの場合に更新しないように注意
        const update: any = {
            $set: {
                updated_at: new Date(), // $setオブジェクトが空だとMongoエラーになるので
                'ttts_extension.checkedReservations': checkedReservations.map((r) => {
                    return {
                        id: r.id
                        // underName: r.underName
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

function aggregateUncheckedReservations(reservations: factory.reservation.event.IReservation[]) {
    let checkedReservations: factory.reservation.event.IReservation[] = [];

    // 入場予約を検索
    checkedReservations = reservations
        .filter((r) => r.checkins.length > 0);

    return {
        checkedReservations
    };
}
