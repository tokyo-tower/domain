/**
 * 予約サービス
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as moment from 'moment';

import * as factory from '@tokyotower/factory';

import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as TaskRepo } from '../repo/task';

/**
 * 予約取消時処理
 */
export function onReservationStatusChanged(
    params: factory.chevre.reservation.IReservation<factory.chevre.reservationType.EventReservation>
) {
    return async (repos: {
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        const reservation = params;

        switch (reservation.reservationStatus) {
            case factory.chevre.reservationStatusType.ReservationCancelled:
                // 東京タワーDB側の予約もステータス変更
                await repos.reservation.cancel({ id: reservation.id });

                break;

            case factory.chevre.reservationStatusType.ReservationConfirmed:
                // 予約データを作成する
                const tttsResevation: factory.reservation.event.IReservation = {
                    ...reservation,
                    reservationFor: {
                        ...reservation.reservationFor,
                        doorTime: (reservation.reservationFor.doorTime !== undefined)
                            ? moment(reservation.reservationFor.doorTime)
                                .toDate()
                            : undefined,
                        endDate: moment(reservation.reservationFor.endDate)
                            .toDate(),
                        startDate: moment(reservation.reservationFor.startDate)
                            .toDate()
                    },
                    checkins: []
                };
                await repos.reservation.saveEventReservation(tttsResevation);

                break;

            case factory.chevre.reservationStatusType.ReservationHold:
                // 車椅子予約であれば、レート制限

                break;

            case factory.chevre.reservationStatusType.ReservationPending:
                break;

            default:
        }

        // 集計タスク作成
        const aggregateTask: factory.task.aggregateEventReservations.IAttributes = {
            name: <any>factory.taskName.AggregateEventReservations,
            project: { typeOf: cinerinoapi.factory.organizationType.Project, id: params.project.id },
            status: factory.taskStatus.Ready,
            // Chevreの在庫解放が非同期で実行されるのでやや時間を置く
            // tslint:disable-next-line:no-magic-numbers
            runsAt: moment().add(10, 'seconds').toDate(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { id: reservation.reservationFor.id }
        };
        await repos.task.save(<any>aggregateTask);
    };
}
