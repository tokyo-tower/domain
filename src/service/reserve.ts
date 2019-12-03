/**
 * 予約サービス
 */
import * as cinerino from '@cinerino/domain';
import * as moment from 'moment';

import * as factory from '@tokyotower/factory';

import { MongoRepository as ReservationRepo } from '../repo/reservation';

import * as chevre from '../chevre';
import { credentials } from '../credentials';

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;

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
        project: cinerino.repository.Project;
        reservation: ReservationRepo;
        task: cinerino.repository.Task;
        ticketTypeCategoryRateLimit: cinerino.repository.rateLimit.TicketTypeCategory;
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
        let extraReservations: factory.chevre.reservation.IReservation<factory.chevre.reservationType.EventReservation>[] = [];

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
        task: cinerino.repository.Task;
        ticketTypeCategoryRateLimit: cinerino.repository.rateLimit.TicketTypeCategory;
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
                    // 車椅子券種であれば、レート制限解除
                    let ticketTypeCategory = factory.ticketTypeCategory.Normal;
                    if (Array.isArray(reservation.reservedTicket.ticketType.additionalProperty)) {
                        const categoryProperty =
                            reservation.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
                        if (categoryProperty !== undefined) {
                            ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                        }
                    }

                    if (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair) {
                        const rateLimitKey = {
                            performanceStartDate: moment(reservation.reservationFor.startDate)
                                .toDate(),
                            ticketTypeCategory: ticketTypeCategory,
                            unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                        };

                        // 保持者が取引IDであれば、車椅子流入制限解除
                        const holder = await repos.ticketTypeCategoryRateLimit.getHolder(rateLimitKey);
                        let transactionId: string | undefined;
                        if (reservation.underName !== undefined && Array.isArray(reservation.underName.identifier)) {
                            const transactionProperty = reservation.underName.identifier.find((p) => p.name === 'transaction');
                            if (transactionProperty !== undefined) {
                                transactionId = transactionProperty.value;
                            }
                        }

                        let transactionExpires: Date | undefined;
                        if (reservation.underName !== undefined && Array.isArray(reservation.underName.identifier)) {
                            const transactionExpiresProperty = reservation.underName.identifier.find(
                                (p) => p.name === 'transactionExpires'
                            );
                            if (transactionExpiresProperty !== undefined) {
                                transactionExpires = moment(transactionExpiresProperty.value)
                                    .toDate();
                            }
                        }

                        // 取引期限なし(確定予約からの取消)、あるいは、取引期限を超過している場合
                        if (transactionExpires === undefined
                            || moment(reservation.modifiedTime).isAfter(moment(transactionExpires))) {
                            if (holder === transactionId) {
                                await repos.ticketTypeCategoryRateLimit.unlock(rateLimitKey);
                            }
                        }
                    }

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
                project: { typeOf: 'Project', id: params.project.id },
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
