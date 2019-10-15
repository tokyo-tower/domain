/**
 * 在庫の管理に対して責任を負うサービス
 */
import * as cinerino from '@cinerino/domain';
import * as moment from 'moment';

import * as factory from '@tokyotower/factory';

const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;

/**
 * 仮予約承認取消
 */
// export function cancelSeatReservationAuth(params: factory.cinerino.task.IData<factory.cinerino.taskName.CancelSeatReservation>) {
//     return async (repos: {
//         action: cinerino.repository.Action;
//         project: cinerino.repository.Project;
//         task: cinerino.repository.Task;
//         ticketTypeCategoryRateLimit: cinerino.repository.rateLimit.TicketTypeCategory;
//     }) => {
//         // 座席予約キャンセル
//         await cinerino.service.stock.cancelSeatReservationAuth(params)(repos);

//         // 座席仮予約アクションを取得
//         const authorizeActions = await repos.action.searchByPurpose({
//             typeOf: factory.actionType.AuthorizeAction,
//             purpose: {
//                 typeOf: params.purpose.typeOf,
//                 id: params.purpose.id
//             }
//         })
//             .then((actions) => actions
//                 .filter((a) => a.object.typeOf === factory.action.authorize.seatReservation.ObjectType.SeatReservation)
//                 .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
//             );

//         await Promise.all(authorizeActions.map(async (action) => {
//             const event = action.object.event;

//             if (action.result !== undefined) {
//                 const actionResult = <factory.action.authorize.seatReservation.IResult>action.result;
//                 const acceptedOffers = (Array.isArray(actionResult.acceptedOffers)) ? actionResult.acceptedOffers : [];

//                 await Promise.all(acceptedOffers.map(async (acceptedOffer) => {
//                     const reservation = acceptedOffer.itemOffered;

//                     let ticketTypeCategory = factory.ticketTypeCategory.Normal;
//                     if (Array.isArray(reservation.reservedTicket.ticketType.additionalProperty)) {
//                         const categoryProperty =
//                             reservation.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
//                         if (categoryProperty !== undefined) {
//                             ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
//                         }
//                     }

//                     if (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair) {
//                         const rateLimitKey = {
//                             performanceStartDate: moment(`${event.startDate}`)
//                                 .toDate(),
//                             ticketTypeCategory: ticketTypeCategory,
//                             unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
//                         };
//                         await repos.ticketTypeCategoryRateLimit.unlock(rateLimitKey);
//                     }
//                 }));
//             }

//             // 集計タスク作成
//             const aggregateTask: factory.task.aggregateEventReservations.IAttributes = {
//                 name: <any>factory.taskName.AggregateEventReservations,
//                 project: project,
//                 status: factory.taskStatus.Ready,
//                 // Chevreの在庫解放が非同期で実行されるのでやや時間を置く
//                 // tslint:disable-next-line:no-magic-numbers
//                 runsAt: moment().add(5, 'seconds').toDate(),
//                 remainingNumberOfTries: 3,
//                 numberOfTried: 0,
//                 executionResults: [],
//                 data: { id: event.id }
//             };
//             await repos.task.save(<any>aggregateTask);
//         }));
//     };
// }

/**
 * 取引失効時処理
 */
export function onTransactionVoided(params: {
    project: { id: string };
    typeOf: factory.transactionType;
    id: string;
}) {
    return async (repos: {
        action: cinerino.repository.Action;
        task: cinerino.repository.Task;
        ticketTypeCategoryRateLimit: cinerino.repository.rateLimit.TicketTypeCategory;
    }) => {
        // 座席仮予約アクションを取得
        const authorizeActions = await repos.action.searchByPurpose({
            typeOf: factory.actionType.AuthorizeAction,
            purpose: {
                typeOf: params.typeOf,
                id: params.id
            }
        })
            .then((actions) => actions
                .filter((a) => a.object.typeOf === factory.action.authorize.seatReservation.ObjectType.SeatReservation)
                // .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
            );

        await Promise.all(authorizeActions.map(async (action) => {
            const event = action.object.event;

            if (action.result !== undefined) {
                const actionResult = <factory.action.authorize.seatReservation.IResult>action.result;
                const acceptedOffers = (Array.isArray(actionResult.acceptedOffers)) ? actionResult.acceptedOffers : [];

                await Promise.all(acceptedOffers.map(async (acceptedOffer) => {
                    const reservation = acceptedOffer.itemOffered;

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
                            performanceStartDate: moment(`${event.startDate}`)
                                .toDate(),
                            ticketTypeCategory: ticketTypeCategory,
                            unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                        };
                        await repos.ticketTypeCategoryRateLimit.unlock(rateLimitKey);
                    }
                }));
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
                data: { id: event.id }
            };
            await repos.task.save(<any>aggregateTask);
        }));
    };
}
