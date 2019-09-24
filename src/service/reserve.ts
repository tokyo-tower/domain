/**
 * 予約サービス
 */
import * as cinerino from '@cinerino/domain';
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '@tokyotower/factory';

import { MongoRepository as ReservationRepo } from '../repo/reservation';

import * as chevre from '../chevre';
import { credentials } from '../credentials';

const debug = createDebug('ttts-domain:service');

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
    // tslint:disable-next-line:max-func-body-length
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

        let ticketTypeCategory = ((<any>reservation).ticket_ttts_extension !== undefined)
            ? (<any>reservation).ticket_ttts_extension.category
            : ''; // 互換性維持のため
        if (Array.isArray(reservation.reservedTicket.ticketType.additionalProperty)) {
            const categoryProperty = reservation.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
            if (categoryProperty !== undefined) {
                ticketTypeCategory = categoryProperty.value;
            }
        }

        // 券種による流入制限解放
        if (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair) {
            await repos.ticketTypeCategoryRateLimit.unlock({
                ticketTypeCategory: ticketTypeCategory,
                performanceStartDate: moment(reservation.reservationFor.startDate).toDate(),
                unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
            });
            debug('rate limit reset.');
        }

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

        const task: factory.task.aggregateEventReservations.IAttributes = {
            name: <any>factory.taskName.AggregateEventReservations,
            project: project,
            status: factory.taskStatus.Ready,
            // Chevreの在庫解放が非同期で実行されるのでやや時間を置く
            // tslint:disable-next-line:no-magic-numbers
            runsAt: moment().add(10, 'seconds').toDate(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: {
                id: reservation.reservationFor.id
            }
        };
        await repos.task.save(<any>task);
    };
}
