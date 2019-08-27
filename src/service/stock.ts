/**
 * 在庫の管理に対して責任を負うサービス
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '@tokyotower/factory';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

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
 * 仮予約承認取消
 */
export function cancelSeatReservationAuth(transactionId: string) {
    return async (
        actionRepo: ActionRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
        taskRepo: TaskRepo,
        projectRepo: ProjectRepo
    ) => {
        const projectDetails = await projectRepo.findById({ id: project.id });
        if (projectDetails.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (projectDetails.settings.chevre === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        // 座席仮予約アクションを取得
        const authorizeActions = await actionRepo.searchByPurpose({
            typeOf: factory.actionType.AuthorizeAction,
            purpose: {
                typeOf: factory.transactionType.PlaceOrder,
                id: transactionId
            }
        })
            .then((actions) => actions
                .filter((a) => a.object.typeOf === factory.action.authorize.seatReservation.ObjectType.SeatReservation)
                .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
            );

        const reserveService = new chevre.service.transaction.Reserve({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: chevreAuthClient
        });

        await Promise.all(authorizeActions.map(async (action) => {
            if (action.result !== undefined) {
                const reserveTransaction = action.result.responseBody;
                await reserveService.cancel({ id: reserveTransaction.id });
            }

            const performance = action.object.event;

            // 在庫を元の状態に戻す
            const tmpReservations = (<factory.action.authorize.seatReservation.IResult>action.result).tmpReservations;

            await Promise.all(tmpReservations.map(async (tmpReservation) => {
                let ticketTypeCategory = factory.ticketTypeCategory.Normal;
                if (Array.isArray(tmpReservation.reservedTicket.ticketType.additionalProperty)) {
                    const categoryProperty =
                        tmpReservation.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
                    if (categoryProperty !== undefined) {
                        ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                    }
                }

                if (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair) {
                    debug('resetting wheelchair rate limit...');
                    const performanceStartDate = moment(`${performance.startDate}`).toDate();
                    const rateLimitKey = {
                        performanceStartDate: performanceStartDate,
                        ticketTypeCategory: ticketTypeCategory,
                        unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                    };
                    await ticketTypeCategoryRateLimitRepo.unlock(rateLimitKey);
                    debug('wheelchair rate limit reset.');
                }
            }));

            // 集計タスク作成
            const aggregateTask: factory.task.aggregateEventReservations.IAttributes = {
                name: <any>factory.taskName.AggregateEventReservations,
                status: factory.taskStatus.Ready,
                // Chevreの在庫解放が非同期で実行されるのでやや時間を置く
                // tslint:disable-next-line:no-magic-numbers
                runsAt: moment().add(5, 'seconds').toDate(),
                remainingNumberOfTries: 3,
                numberOfTried: 0,
                executionResults: [],
                data: { id: performance.id }
            };
            await taskRepo.save(<any>aggregateTask);
        }));
    };
}

/**
 * 仮予約→本予約
 */
export function transferSeatReservation(transactionId: string) {
    return async (
        transactionRepo: TransactionRepo,
        reservationRepo: ReservationRepo,
        taskRepo: TaskRepo,
        projectRepo: ProjectRepo
    ) => {
        const projectDetails = await projectRepo.findById({ id: project.id });
        if (projectDetails.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (projectDetails.settings.chevre === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const transaction = await transactionRepo.findById({ typeOf: factory.transactionType.PlaceOrder, id: transactionId });
        const reservations = (<factory.transaction.placeOrder.IResult>transaction.result).order.acceptedOffers
            .map((o) => <factory.cinerino.order.IReservation>o.itemOffered);

        // 座席仮予約アクションを取得
        // const authorizeActions = <factory.action.authorize.seatReservation.IAction[]>transaction.object.authorizeActions
        //     .filter((a) => a.object.typeOf === factory.action.authorize.seatReservation.ObjectType.SeatReservation)
        //     .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus);

        // const reserveService = new chevre.service.transaction.Reserve({
        //     endpoint: projectDetails.settings.chevre.endpoint,
        //     auth: chevreAuthClient
        // });

        // await Promise.all(authorizeActions.map(async (a) => {
        //     if (a.result !== undefined) {
        //         const reserveTransaction = a.result.responseBody;
        //         if (reserveTransaction !== undefined) {
        //             // Chevre予約取引確定
        //             await reserveService.confirm({
        //                 id: reserveTransaction.id,
        //                 object: {
        //                     reservations: reservations.map((r) => {
        //                         // プロジェクト固有の値を連携
        //                         return {
        //                             id: r.id,
        //                             additionalTicketText: r.additionalTicketText,
        //                             reservedTicket: {
        //                                 issuedBy: r.reservedTicket.issuedBy,
        //                                 ticketToken: r.reservedTicket.ticketToken,
        //                                 underName: r.reservedTicket.underName
        //                             },
        //                             underName: r.underName,
        //                             additionalProperty: r.additionalProperty
        //                         };
        //                     })
        //                 }
        //             });
        //         }
        //     }
        // }));

        await Promise.all(reservations.map(async (reservation) => {
            /// 予約データを作成する
            await reservationRepo.saveEventReservation({
                ...reservation,
                checkins: []
            });

            // 集計タスク作成
            const task: factory.task.aggregateEventReservations.IAttributes = {
                name: <any>factory.taskName.AggregateEventReservations,
                status: factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    id: reservation.reservationFor.id
                }
            };
            await taskRepo.save(<any>task);
        }));
    };
}
