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
export interface ICheckinGate {
    /**
     * 識別子
     */
    identifier: string;
    /**
     * ゲート名
     */
    name: string;
}

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

const placeService = new cinerinoapi.service.Place({
    endpoint: credentials.cinerino.endpoint,
    auth: cinerinoAuthClient,
    project: { id: <string>process.env.PROJECT_ID }
});

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
        const searchMovieTheatersResult = await placeService.searchMovieTheaters({ branchCodes: [event.superEvent.location.branchCode] });
        const movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new factory.errors.NotFound('MovieTheater');
        }

        let checkGates: ICheckinGate[] = [];
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
function aggregateByEvent(params: {
    checkGates: ICheckinGate[];
    event: factory.performance.IPerformance;
}) {
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
                reservedTicket: 1,
                underName: 1
            }
        );
        debug(reservations.length, 'reservations found');

        debug('creating aggregation...');
        let aggregation: factory.performance.IPerformanceAggregation;

        try {
            // Chevreでイベント取得
            const event = await eventService.findById<factory.chevre.eventType.ScreeningEvent>({ id: performance.id });

            // オファーリストをchevreで検索
            const offers = await eventService.searchTicketOffers({
                event: { id: performance.id },
                seller: {
                    typeOf: <factory.chevre.organizationType>event.offers?.seller?.typeOf,
                    id: <string>event.offers?.seller?.id
                },
                store: { id: credentials.cinerino.clientId }
            });

            const {
                aggregateOffer,
                maximumAttendeeCapacity,
                remainingAttendeeCapacity,
                remainingAttendeeCapacityForWheelchair
            } = await aggregateRemainingAttendeeCapacity({ event })();

            // 入場数の集計を行う
            const checkinCountAggregation = aggregateCheckinCount(checkGates, reservations, offers);

            // イベントステータス最終更新時の予約について未入場数を算出する
            const { checkedReservations } = aggregateUncheckedReservations(reservations, event);

            aggregation = {
                id: performance.id,
                aggregateOffer,
                aggregateReservation: event.aggregateReservation,
                maximumAttendeeCapacity: maximumAttendeeCapacity,
                remainingAttendeeCapacity: remainingAttendeeCapacity,
                remainingAttendeeCapacityForWheelchair: remainingAttendeeCapacityForWheelchair,
                reservationCount: event.aggregateReservation?.reservationCount,
                checkinCount: checkinCountAggregation.checkinCount,
                reservationCountsByTicketType: offers.map((offer) => {
                    const aggregationByOffer = event.aggregateOffer?.offers?.find((o) => o.id === offer.id);

                    return {
                        ticketType: <string>offer.id,
                        count: aggregationByOffer?.aggregateReservation?.reservationCount
                    };
                }),
                checkinCountsByWhere: checkinCountAggregation.checkinCountsByWhere
            };
            debug('aggregated!', aggregation);

            // パフォーマンスリポジトリに保管
            await saveAggregation2performance(aggregation, checkedReservations)(repos);
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error('couldn\'t create aggregation on event', performance.id, error);
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
                checkinCount: params.checkinCount,
                reservationCountsByTicketType: params.reservationCountsByTicketType,
                checkinCountsByWhere: params.checkinCountsByWhere,
                ...(Array.isArray(params.aggregateOffer?.offers))
                    ? { aggregateOffer: params.aggregateOffer }
                    : undefined,
                ...(typeof params.aggregateReservation?.typeOf === 'string')
                    ? { aggregateReservation: params.aggregateReservation }
                    : undefined,
                ...(typeof params.reservationCount === 'number')
                    ? { reservationCount: params.reservationCount }
                    : undefined,
                ...(typeof params.maximumAttendeeCapacity === 'number')
                    ? { maximumAttendeeCapacity: params.maximumAttendeeCapacity }
                    : undefined,
                ...(typeof params.remainingAttendeeCapacity === 'number')
                    ? { remainingAttendeeCapacity: params.remainingAttendeeCapacity }
                    : undefined,
                ...(typeof params.remainingAttendeeCapacityForWheelchair === 'number')
                    ? { remainingAttendeeCapacityForWheelchair: params.remainingAttendeeCapacityForWheelchair }
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
 * 残席数を集計する
 */
function aggregateRemainingAttendeeCapacity(params: {
    event: factory.chevre.event.screeningEvent.IEvent;
}) {
    return async () => {
        const event = params.event;

        // Chevreのオファーごと集計を利用する場合は↓
        const aggregateOffer = event.aggregateOffer;
        const maximumAttendeeCapacity = aggregateOffer?.offers?.find((o) => o.identifier === '001')?.maximumAttendeeCapacity;
        const remainingAttendeeCapacity = aggregateOffer?.offers?.find((o) => o.identifier === '001')?.remainingAttendeeCapacity;
        const remainingAttendeeCapacityForWheelchair =
            aggregateOffer?.offers?.find((o) => o.identifier === '004')?.remainingAttendeeCapacity;

        return { aggregateOffer, maximumAttendeeCapacity, remainingAttendeeCapacity, remainingAttendeeCapacityForWheelchair };
    };
}

/**
 * 入場数の集計を行う
 */
function aggregateCheckinCount(
    checkinGates: ICheckinGate[],
    reservations: factory.reservation.event.IReservation[],
    offers: factory.chevre.event.screeningEvent.ITicketOffer[]
): {
    checkinCount: number;
    checkinCountsByWhere: factory.performance.ICheckinCountByWhere[];
} {
    // 全予約の入場履歴をマージ
    const allUniqueCheckins: factory.performance.ICheckinWithTicketType[] = reservations.reduce(
        (a, b) => {
            // 追加特性参照からカテゴリー参照へ変更
            // const ticketTypeCategory = <string>b.reservedTicket.ticketType.additionalProperty?.find((p) => p.name === 'category')?.value;
            const ticketTypeCategory = <string>b.reservedTicket.ticketType.category?.codeValue;

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
                // 追加特性参照からカテゴリー参照へ変更
                // const ticketTypeCategory = <string>offer.additionalProperty?.find((p) => p.name === 'category')?.value;
                const ticketTypeCategory = <string>offer.category?.codeValue;

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

function aggregateUncheckedReservations(
    reservations: factory.reservation.event.IReservation[],
    __: factory.performance.IPerformance
) {
    let checkedReservations: factory.reservation.event.IReservation[] = [];

    // 入場予約を検索
    // const targetReservationIds = reservationsAtLastUpdateDate.map((r) => r.id);
    checkedReservations = reservations
        // .filter((r) => targetReservationIds.includes(r.id))
        .filter((r) => r.checkins.length > 0);
    // uncheckedReservations = await repos.re.search({
    //     typeOf: factory.chevre.reservationType.EventReservation,
    //     ids: targetReservationIds,
    //     checkins: { $size: 0 } // $sizeが0より大きい、という検索は現時点ではMongoDBが得意ではない
    // });

    return {
        checkedReservations
    };
}
