import * as createDebug from 'debug';
import * as moment from 'moment-timezone';

import * as factory from '@tokyotower/factory';

import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../../../../../repo/action/authorize/seatReservation';
import { MongoRepository as PerformanceRepo } from '../../../../../repo/performance';
import { MongoRepository as ProjectRepo } from '../../../../../repo/project';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../../../../../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as TaskRepo } from '../../../../../repo/task';
import { MongoRepository as TransactionRepo } from '../../../../../repo/transaction';

import * as chevre from '../../../../../chevre';
import { credentials } from '../../../../../credentials';

const debug = createDebug('ttts-domain:service');

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

const chevreAuthClient = new chevre.auth.ClientCredentials({
    domain: credentials.chevre.authorizeServerDomain,
    clientId: credentials.chevre.clientId,
    clientSecret: credentials.chevre.clientSecret,
    scopes: [],
    state: ''
});

const WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS = (process.env.WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS !== undefined)
    ? Number(process.env.WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS)
    // tslint:disable-next-line:no-magic-numbers
    : 6;

const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;

export type ICreateOpetaiton<T> = (
    transactionRepo: TransactionRepo,
    performanceRepo: PerformanceRepo,
    seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
    ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
    taskRepo: TaskRepo,
    projectRepo: ProjectRepo
) => Promise<T>;

export type ICancelOpetaiton<T> = (
    transactionRepo: TransactionRepo,
    seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
    ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
    taskRepo: TaskRepo,
    projectRepo: ProjectRepo
) => Promise<T>;

export type IValidateOperation<T> = () => Promise<T>;

export type IAcceptedOfferWithSeatNumber = factory.offer.seatReservation.IOffer & {
    itemOffered: factory.action.authorize.seatReservation.ITmpReservation;
};

/**
 * オファーのバリデーション
 * 座席の自動選択を含む
 */
// tslint:disable-next-line:max-func-body-length
function validateOffers(
    projectDetails: factory.project.IProject,
    performance: factory.performance.IPerformanceWithDetails,
    acceptedOffers: factory.offer.seatReservation.IAcceptedOffer[],
    transactionId: string
): IValidateOperation<IAcceptedOfferWithSeatNumber[]> {
    return async () => {
        if (projectDetails.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (projectDetails.settings.chevre === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const acceptedOffersWithSeatNumber: IAcceptedOfferWithSeatNumber[] = [];

        const eventService = new chevre.service.Event({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: chevreAuthClient
        });

        // チケットオファー検索
        const ticketOffers = await eventService.searchTicketOffers({ id: performance.id });

        // Chevreで全座席オファーを検索
        const screeningRoomSectionOffers = await eventService.searchOffers({ id: performance.id });
        const sectionOffer = screeningRoomSectionOffers[0];

        const seats = sectionOffer.containsPlace;
        const unavailableSeats = seats.filter((s) => {
            return Array.isArray(s.offers)
                && s.offers.length > 0
                && s.offers[0].availability === chevre.factory.itemAvailability.OutOfStock;
        }).map((s) => {
            return {
                seatSection: sectionOffer.branchCode,
                seatNumber: s.branchCode
            };
        });
        const unavailableSeatNumbers = unavailableSeats.map((s) => s.seatNumber);
        debug('unavailableSeatNumbers:', unavailableSeatNumbers.length);

        // tslint:disable-next-line:max-func-body-length
        for (const offer of acceptedOffers) {
            // リクエストで指定されるのは、券種IDではなく券種コードなので要注意
            const ticketOffer = ticketOffers.find((t) => t.identifier === offer.ticket_type);
            if (ticketOffer === undefined) {
                throw new factory.errors.NotFound('Offer', `Offer ${offer.ticket_type} not found`);
            }
            const unitPriceSpec =
                <chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.UnitPriceSpecification>>
                ticketOffer.priceSpecification.priceComponent.find((c) => {
                    return c.typeOf === chevre.factory.priceSpecificationType.UnitPriceSpecification;
                });
            if (unitPriceSpec === undefined) {
                throw new factory.errors.NotFound('Unit Price Specification');
            }
            const unitPrice = unitPriceSpec.price;
            if (unitPrice === undefined) {
                throw new factory.errors.NotFound('Unit Price');
            }

            let ticketTypeCategory = factory.ticketTypeCategory.Normal;
            if (Array.isArray(ticketOffer.additionalProperty)) {
                const categoryProperty = ticketOffer.additionalProperty.find((p) => p.name === 'category');
                if (categoryProperty !== undefined) {
                    ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                }
            }

            // まず利用可能な座席は全座席
            let availableSeats = sectionOffer.containsPlace.map((p) => {
                return {
                    branchCode: p.branchCode,
                    seatingType: <factory.place.movieTheater.ISeatingType><unknown>p.seatingType
                };
            });
            let availableSeatsForAdditionalStocks = sectionOffer.containsPlace.map((p) => {
                return {
                    branchCode: p.branchCode,
                    seatingType: <factory.place.movieTheater.ISeatingType><unknown>p.seatingType
                };
            });
            debug(availableSeats.length, 'seats exist');

            // 未確保の座席に絞る
            availableSeats = availableSeats.filter((s) => unavailableSeatNumbers.indexOf(s.branchCode) < 0);
            availableSeatsForAdditionalStocks = availableSeatsForAdditionalStocks.filter(
                (s) => unavailableSeatNumbers.indexOf(s.branchCode) < 0
            );

            // 車椅子予約の場合、車椅子座席に絞る
            // 一般予約は、車椅子座席でも予約可能
            const isWheelChairOffer = ticketTypeCategory === factory.ticketTypeCategory.Wheelchair;
            if (isWheelChairOffer) {
                // 車椅子予約の場合、車椅子タイプ座席のみ
                availableSeats = availableSeats.filter(
                    (s) => s.seatingType.typeOf === factory.place.movieTheater.SeatingType.Wheelchair
                );

                // 余分確保は一般座席から
                availableSeatsForAdditionalStocks = availableSeatsForAdditionalStocks.filter(
                    (s) => s.seatingType.typeOf === factory.place.movieTheater.SeatingType.Normal
                );

                // 車椅子確保分が一般座席になければ車椅子は0
                if (availableSeatsForAdditionalStocks.length < WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS) {
                    availableSeats = [];
                }
            } else {
                availableSeats = availableSeats.filter(
                    (s) => s.seatingType.typeOf === factory.place.movieTheater.SeatingType.Normal
                );

                // 余分確保なし
                availableSeatsForAdditionalStocks = [];
            }
            debug(availableSeats.length, 'availableSeats exist');

            // 1つ空席を選択(自動選択)
            const selectedSeat = availableSeats.find((s) => unavailableSeatNumbers.indexOf(s.branchCode) < 0);
            debug('selectedSeat:', selectedSeat);
            if (selectedSeat === undefined) {
                throw new factory.errors.AlreadyInUse('action.object', ['offers'], 'No available seats.');
            }
            unavailableSeatNumbers.push(selectedSeat.branchCode);

            // 余分確保分を選択
            const selectedSeatsForAdditionalStocks = availableSeatsForAdditionalStocks.slice(0, WHEEL_CHAIR_NUM_ADDITIONAL_STOCKS);
            unavailableSeatNumbers.push(...selectedSeatsForAdditionalStocks.map((s) => s.branchCode));

            const ticketType: chevre.factory.ticketType.ITicketType = {
                project: ticketOffer.priceSpecification.project,
                typeOf: ticketOffer.typeOf,
                id: ticketOffer.id,
                identifier: ticketOffer.identifier,
                name: <any>ticketOffer.name,
                priceSpecification: unitPriceSpec,
                priceCurrency: ticketOffer.priceCurrency,
                additionalProperty: ticketOffer.additionalProperty
            };

            acceptedOffersWithSeatNumber.push({
                ...offer,
                additionalProperty: ticketOffer.additionalProperty,
                price: unitPrice,
                priceCurrency: factory.priceCurrency.JPY,
                itemOffered: {
                    id: '',
                    reservationNumber: '',
                    additionalTicketText: offer.watcher_name,
                    reservedTicket: {
                        typeOf: 'Ticket',
                        priceCurrency: factory.priceCurrency.JPY,
                        ticketedSeat: {
                            seatSection: sectionOffer.branchCode,
                            seatNumber: selectedSeat.branchCode,
                            seatRow: '',
                            seatingType: <any>selectedSeat.seatingType,
                            typeOf: factory.chevre.placeType.Seat
                        },
                        ticketType: ticketType
                    },
                    additionalProperty: [
                        { name: 'transaction', value: transactionId },
                        ...(selectedSeatsForAdditionalStocks.length > 0)
                            ? [{
                                name: 'extraSeatNumbers',
                                value: JSON.stringify(selectedSeatsForAdditionalStocks.map((s) => s.branchCode))
                            }]
                            : []
                    ]
                }
            });

            selectedSeatsForAdditionalStocks.forEach((s) => {
                acceptedOffersWithSeatNumber.push({
                    ...offer,
                    additionalProperty: ticketOffer.additionalProperty,
                    price: unitPrice,
                    priceCurrency: factory.priceCurrency.JPY,
                    itemOffered: {
                        id: '',
                        reservationNumber: '',
                        additionalTicketText: offer.watcher_name,
                        reservedTicket: {
                            typeOf: 'Ticket',
                            priceCurrency: factory.priceCurrency.JPY,
                            ticketedSeat: {
                                seatSection: sectionOffer.branchCode,
                                seatNumber: s.branchCode,
                                seatRow: '',
                                seatingType: <any>s.seatingType,
                                typeOf: factory.chevre.placeType.Seat
                            },
                            ticketType: {
                                ...ticketType,
                                priceSpecification: {
                                    ...unitPriceSpec,
                                    price: 0 // 余分確保分の単価調整
                                }
                            }
                        },
                        additionalProperty: [
                            { name: 'extra', value: '1' },
                            { name: 'transaction', value: transactionId }
                        ]
                    }
                });
            });
        }

        return acceptedOffersWithSeatNumber;
    };
}

/**
 * 座席を仮予約する
 * 承認アクションオブジェクトが返却されます。
 */
// tslint:disable-next-line:max-func-body-length
export function create(
    agentId: string,
    transactionId: string,
    perfomanceId: string,
    acceptedOffers: factory.offer.seatReservation.IAcceptedOffer[]
): ICreateOpetaiton<factory.action.authorize.seatReservation.IAction> {
    // tslint:disable-next-line:max-func-body-length
    return async (
        transactionRepo: TransactionRepo,
        performanceRepo: PerformanceRepo,
        seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
        // paymentNoRepo: PaymentNoRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
        taskRepo: TaskRepo,
        projectRepo: ProjectRepo
    ): Promise<factory.action.authorize.seatReservation.IAction> => {
        debug('creating seatReservation authorizeAction...acceptedOffers:', acceptedOffers.length);

        const projectDetails = await projectRepo.findById({ id: project.id });
        if (projectDetails.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (projectDetails.settings.chevre === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // パフォーマンスを取得
        const performance = await performanceRepo.findById(perfomanceId);

        // 供給情報の有効性を確認
        const acceptedOffersWithSeatNumber = await validateOffers(projectDetails, performance, acceptedOffers, transactionId)();

        // 承認アクションを開始
        const action = await seatReservationAuthorizeActionRepo.start(
            transaction.seller,
            {
                id: transaction.agent.id,
                typeOf: factory.personType.Person
            },
            {
                transactionId: transactionId,
                offers: acceptedOffers,
                performance: performance
            }
        );

        // 在庫から仮予約
        let tmpReservations: factory.action.authorize.seatReservation.ITmpReservation[] = [];

        const performanceStartDate = moment(performance.startDate).toDate();
        let requestBody: factory.chevre.transaction.reserve.IStartParamsWithoutDetail | undefined;
        let responseBody: factory.chevre.transaction.ITransaction<factory.chevre.transactionType.Reserve> | undefined;

        try {
            // 車椅子予約がある場合、レート制限
            await Promise.all(acceptedOffersWithSeatNumber
                .filter((o) => {
                    const r = o.itemOffered;
                    // 余分確保分を除く
                    let extraProperty: factory.propertyValue.IPropertyValue<string> | undefined;
                    if (r.additionalProperty !== undefined) {
                        extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                    }

                    return r.additionalProperty === undefined
                        || extraProperty === undefined
                        || extraProperty.value !== '1';
                })
                .map(async (offer) => {
                    let ticketTypeCategory = factory.ticketTypeCategory.Normal;
                    if (Array.isArray(offer.additionalProperty)) {
                        const categoryProperty = offer.additionalProperty.find((p) => p.name === 'category');
                        if (categoryProperty !== undefined) {
                            ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                        }
                    }

                    if (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair) {
                        // 車椅子レート制限枠確保(取引IDを保持者に指定)
                        await ticketTypeCategoryRateLimitRepo.lock(
                            {
                                performanceStartDate: performanceStartDate,
                                ticketTypeCategory: ticketTypeCategory,
                                unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                            },
                            transaction.id
                        );
                        debug('wheelchair rate limit checked.');
                    }
                })
            );

            // Chevre仮予約
            const reserveService = new chevre.service.transaction.Reserve({
                endpoint: projectDetails.settings.chevre.endpoint,
                auth: chevreAuthClient
            });

            requestBody = {
                project: project,
                typeOf: chevre.factory.transactionType.Reserve,
                agent: {
                    typeOf: transaction.agent.typeOf,
                    name: transaction.agent.id
                },
                object: {
                    event: {
                        id: performance.id
                    },
                    acceptedOffer: acceptedOffersWithSeatNumber.map((o) => {
                        const ticketedSeat = o.itemOffered.reservedTicket.ticketedSeat;
                        if (ticketedSeat === undefined) {
                            throw new Error('ticketedSeat undefined');
                        }

                        return {
                            id: o.itemOffered.reservedTicket.ticketType.id,
                            ticketedSeat: {
                                typeOf: chevre.factory.placeType.Seat,
                                seatSection: ticketedSeat.seatSection,
                                seatNumber: ticketedSeat.seatNumber,
                                seatRow: ''
                            }
                        };
                    })
                },
                expires: moment(performance.endDate).add(1, 'month').toDate()
            };

            responseBody = await reserveService.start(requestBody);

            const reservations = responseBody.object.reservations;
            tmpReservations = acceptedOffersWithSeatNumber.map((o) => {
                // 該当座席のChevre予約を検索
                const chevreReservation = reservations.find((r) => {
                    return r.reservedTicket.ticketedSeat !== undefined
                        && o.itemOffered.reservedTicket.ticketedSeat !== undefined
                        && r.reservedTicket.ticketedSeat.seatNumber === o.itemOffered.reservedTicket.ticketedSeat.seatNumber;
                });

                if (chevreReservation === undefined) {
                    throw new factory.errors.ServiceUnavailable('Reservation not found for an accepted offer');
                }

                return {
                    ...o.itemOffered,
                    id: chevreReservation.id,
                    reservationNumber: chevreReservation.reservationNumber,
                    reservedTicket: chevreReservation.reservedTicket
                };
            });
            debug(tmpReservations.length, 'tmp reservation(s) created');
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : error;
                await seatReservationAuthorizeActionRepo.giveUp(action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            try {
                // 仮予約があれば削除
                if (responseBody !== undefined) {
                    const reserveService = new chevre.service.transaction.Reserve({
                        endpoint: projectDetails.settings.chevre.endpoint,
                        auth: chevreAuthClient
                    });

                    await reserveService.cancel({ id: responseBody.id });
                }

                // 車椅子レート制限解放
                await Promise.all(acceptedOffersWithSeatNumber.map(async (offer) => {
                    let ticketTypeCategory = factory.ticketTypeCategory.Normal;
                    if (Array.isArray(offer.additionalProperty)) {
                        const categoryProperty = offer.additionalProperty.find((p) => p.name === 'category');
                        if (categoryProperty !== undefined) {
                            ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                        }
                    }

                    if (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair) {
                        const rateLimitKey = {
                            performanceStartDate: performanceStartDate,
                            ticketTypeCategory: ticketTypeCategory,
                            unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                        };
                        const holder = await ticketTypeCategoryRateLimitRepo.getHolder(rateLimitKey);
                        if (holder === transaction.id) {
                            debug('resetting wheelchair rate limit...');
                            await ticketTypeCategoryRateLimitRepo.unlock(rateLimitKey);
                            debug('wheelchair rate limit reset.');
                        }
                    }
                }));
            } catch (error) {
                // no op
                // 失敗したら仕方ない
            }

            throw error;
        }

        try {
            // 集計タスク作成
            const aggregateTask: factory.task.aggregateEventReservations.IAttributes = {
                name: factory.taskName.AggregateEventReservations,
                status: factory.taskStatus.Ready,
                // Chevreの在庫解放が非同期で実行されるのでやや時間を置く
                // tslint:disable-next-line:no-magic-numbers
                runsAt: moment().add(5, 'seconds').toDate(),
                remainingNumberOfTries: 3,
                // tslint:disable-next-line:no-null-keyword
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { id: performance.id }
            };
            await taskRepo.save(aggregateTask);
        } catch (error) {
            // no op
        }

        // アクションを完了
        const result: factory.action.authorize.seatReservation.IResult = {
            price: tmpReservations
                .filter((r) => {
                    // 余分確保分を除く
                    let extraProperty: factory.propertyValue.IPropertyValue<string> | undefined;
                    if (r.additionalProperty !== undefined) {
                        extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                    }

                    return r.additionalProperty === undefined
                        || extraProperty === undefined
                        || extraProperty.value !== '1';
                })
                .reduce(
                    (a, b) => {
                        const unitPriceSpec = b.reservedTicket.ticketType.priceSpecification;
                        const unitPrice = (unitPriceSpec !== undefined) ? unitPriceSpec.price : 0;

                        return a + unitPrice;
                    },
                    0
                ),
            tmpReservations: tmpReservations,
            requestBody: requestBody,
            responseBody: responseBody
        };

        return seatReservationAuthorizeActionRepo.complete(action.id, result);
    };
}

/**
 * 座席予約承認アクションをキャンセルする
 */
export function cancel(
    agentId: string,
    transactionId: string,
    actionId: string
): ICancelOpetaiton<void> {
    return async (
        transactionRepo: TransactionRepo,
        seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
        taskRepo: TaskRepo,
        projectRepo: ProjectRepo
    ) => {
        try {
            const projectDetails = await projectRepo.findById({ id: project.id });
            if (projectDetails.settings === undefined) {
                throw new factory.errors.ServiceUnavailable('Project settings undefined');
            }
            if (projectDetails.settings.chevre === undefined) {
                throw new factory.errors.ServiceUnavailable('Project settings not found');
            }

            const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

            if (transaction.agent.id !== agentId) {
                throw new factory.errors.Forbidden('A specified transaction is not yours.');
            }

            // アクションではcompleteステータスであるにも関わらず、在庫は有になっている、というのが最悪の状況
            // それだけは回避するためにアクションを先に変更
            const action = await seatReservationAuthorizeActionRepo.cancel(actionId, transactionId);
            const actionResult = <factory.action.authorize.seatReservation.IResult>action.result;

            const performance = action.object.performance;

            // 在庫から仮予約削除
            debug(`removing ${actionResult.tmpReservations.length} tmp reservations...`);
            const reserveService = new chevre.service.transaction.Reserve({
                endpoint: projectDetails.settings.chevre.endpoint,
                auth: chevreAuthClient
            });

            await reserveService.cancel({ id: (<any>actionResult).responseBody.id });

            // レート制限があれば解除
            const performanceStartDate = moment(performance.startDate).toDate();
            await Promise.all(actionResult.tmpReservations.map(async (tmpReservation) => {
                let ticketTypeCategory = factory.ticketTypeCategory.Normal;
                if (Array.isArray(tmpReservation.reservedTicket.ticketType.additionalProperty)) {
                    const categoryProperty = tmpReservation.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
                    if (categoryProperty !== undefined) {
                        ticketTypeCategory = <factory.ticketTypeCategory>categoryProperty.value;
                    }
                }

                if (ticketTypeCategory === factory.ticketTypeCategory.Wheelchair) {
                    const rateLimitKey = {
                        performanceStartDate: performanceStartDate,
                        ticketTypeCategory: ticketTypeCategory,
                        unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
                    };
                    const holder = await ticketTypeCategoryRateLimitRepo.getHolder(rateLimitKey);
                    if (holder === transaction.id) {
                        debug('resetting wheelchair rate limit...');
                        await ticketTypeCategoryRateLimitRepo.unlock(rateLimitKey);
                        debug('wheelchair rate limit reset.');
                    }
                }
            }));

            // 集計タスク作成
            const aggregateTask: factory.task.aggregateEventReservations.IAttributes = {
                name: factory.taskName.AggregateEventReservations,
                status: factory.taskStatus.Ready,
                // Chevreの在庫解放が非同期で実行されるのでやや時間を置く
                // tslint:disable-next-line:no-magic-numbers
                runsAt: moment().add(5, 'seconds').toDate(),
                remainingNumberOfTries: 3,
                // tslint:disable-next-line:no-null-keyword
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { id: performance.id }
            };
            await taskRepo.save(aggregateTask);
        } catch (error) {
            // no op
        }
    };
}
