/**
 * 予約サービス
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as moment from 'moment';

import * as factory from '@tokyotower/factory';

import { MongoRepository as ProjectRepo } from '../repo/project';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as TaskRepo } from '../repo/task';

import * as chevre from '../chevre';
import { credentials } from '../credentials';

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

const chevreAuthClient = new chevre.auth.ClientCredentials({
    domain: credentials.chevre.authorizeServerDomain,
    clientId: credentials.chevre.clientId,
    clientSecret: credentials.chevre.clientSecret,
    scopes: [],
    state: ''
});

/**
 * 予約をキャンセルする
 */
export function cancelReservation(params: { id: string }) {
    return async (repos: {
        project: ProjectRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        const projectDetails = await repos.project.findById({ id: project.id });
        if (projectDetails.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (projectDetails.settings.chevre === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const cancelReservationService = new chevre.service.transaction.CancelReservation({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: chevreAuthClient
        });

        const reservationService = new chevre.service.Reservation({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: chevreAuthClient
        });

        const reservation = await repos.reservation.findById(params);
        let extraReservations: chevre.factory.reservation.IReservation<factory.chevre.reservationType.EventReservation>[] = [];

        // 車椅子余分確保があればそちらもキャンセル
        if (reservation.additionalProperty !== undefined) {
            const extraSeatNumbersProperty = reservation.additionalProperty.find((p) => p.name === 'extraSeatNumbers');
            if (extraSeatNumbersProperty !== undefined) {
                const extraSeatNumbers = JSON.parse(extraSeatNumbersProperty.value);

                // このイベントの予約から余分確保分を検索
                if (Array.isArray(extraSeatNumbers) && extraSeatNumbers.length > 0) {
                    const searchExtraReservationsResult = await reservationService.search<factory.chevre.reservationType.EventReservation>({
                        limit: 100,
                        typeOf: factory.chevre.reservationType.EventReservation,
                        reservationFor: { id: reservation.reservationFor.id },
                        reservationNumbers: [reservation.reservationNumber],
                        reservedTicket: {
                            ticketedSeat: { seatNumbers: extraSeatNumbers }
                        }
                    });
                    extraReservations = searchExtraReservationsResult.data;
                }
            }
        }

        const targetReservations = [reservation, ...extraReservations];

        await Promise.all(targetReservations.map(async (r) => {
            const cancelReservationTransaction = await cancelReservationService.start({
                project: project,
                typeOf: factory.chevre.transactionType.CancelReservation,
                agent: {
                    typeOf: factory.personType.Person,
                    id: 'tokyotower',
                    name: '@tokyotower/domain'
                },
                object: {
                    reservation: { id: r.id }
                },
                expires: moment()
                    // tslint:disable-next-line:no-magic-numbers
                    .add(1, 'minutes')
                    .toDate()
            });

            await cancelReservationService.confirm(cancelReservationTransaction);

            // 東京タワーDB側の予約もステータス変更
            await repos.reservation.cancel({ id: r.id });
        }));
    };
}

/**
 * 予約取消時処理
 */
export function onReservationStatusChanged(
    params: factory.chevre.reservation.IReservation<factory.chevre.reservationType.EventReservation>
) {
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    return async (repos: {
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        const reservation = params;

        // 余分確保分を除く
        let extraProperty: factory.propertyValue.IPropertyValue<string> | undefined;
        if (reservation.additionalProperty !== undefined) {
            extraProperty = reservation.additionalProperty.find((p) => p.name === 'extra');
        }
        const isExtra = extraProperty !== undefined && extraProperty.value === '1';

        if (!isExtra) {
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
        }
    };
}
