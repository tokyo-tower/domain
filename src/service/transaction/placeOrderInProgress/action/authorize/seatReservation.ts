import * as chevre from '@chevre/api-nodejs-client';
import * as createDebug from 'debug';
import * as moment from 'moment-timezone';

import * as factory from '@motionpicture/ttts-factory';

import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../../../../../repo/action/authorize/seatReservation';
import { RedisRepository as PaymentNoRepo } from '../../../../../repo/paymentNo';
import { MongoRepository as PerformanceRepo } from '../../../../../repo/performance';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../../../../../repo/rateLimit/ticketTypeCategory';
import { RedisRepository as StockRepo } from '../../../../../repo/stock';
import { MongoRepository as TaskRepo } from '../../../../../repo/task';
import { MongoRepository as TransactionRepo } from '../../../../../repo/transaction';

import { credentials } from '../../../../../credentials';

const debug = createDebug('ttts-domain:service');

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
    paymentNoRepo: PaymentNoRepo,
    ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
    stockRepo: StockRepo,
    taskRepo: TaskRepo
) => Promise<T>;

export type ICancelOpetaiton<T> = (
    transactionRepo: TransactionRepo,
    seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
    ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
    stockRepo: StockRepo,
    taskRepo: TaskRepo
) => Promise<T>;

export type IValidateOperation<T> = (repos: {
    stock: StockRepo;
}) => Promise<T>;

export type IAcceptedOfferWithSeatNumber = factory.offer.seatReservation.IOffer & {
    itemOffered: factory.action.authorize.seatReservation.ITmpReservation;
};

/**
 * オファーのバリデーション
 * 座席の自動選択を含む
 */
// tslint:disable-next-line:max-func-body-length
function validateOffers(
    performance: factory.performance.IPerformanceWithDetails,
    acceptedOffers: factory.offer.seatReservation.IAcceptedOffer[],
    transactionId: string
): IValidateOperation<IAcceptedOfferWithSeatNumber[]> {
    return async (repos: {
        stock: StockRepo;
    }) => {
        const acceptedOffersWithSeatNumber: IAcceptedOfferWithSeatNumber[] = [];

        // Chevreで全座席オファーを検索
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.CHEVRE_API_ENDPOINT,
            auth: chevreAuthClient
        });
        const screeningRoomSectionOffers = await eventService.searchOffers({ id: performance.id });
        const sectionOffer = screeningRoomSectionOffers[0];

        const unavailableSeats = await repos.stock.findUnavailableOffersByEventId({ eventId: performance.id });
        const unavailableSeatNumbers = unavailableSeats.map((s) => s.seatNumber);
        debug('unavailableSeatNumbers:', unavailableSeatNumbers.length);

        // tslint:disable-next-line:max-func-body-length
        for (const offer of acceptedOffers) {
            const ticketType = performance.ticket_type_group.ticket_types.find((t) => t.id === offer.ticket_type);
            if (ticketType === undefined) {
                throw new factory.errors.NotFound('Offer', `Offer ${offer.ticket_type} not found`);
            }

            const unitPriceSpec = ticketType.priceSpecification;
            if (unitPriceSpec === undefined) {
                throw new factory.errors.NotFound('Unit Price Specification');
            }

            let ticketTypeCategory = factory.ticketTypeCategory.Normal;
            if (Array.isArray(ticketType.additionalProperty)) {
                const categoryProperty = ticketType.additionalProperty.find((p) => p.name === 'category');
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

            acceptedOffersWithSeatNumber.push({
                ...offer,
                additionalProperty: ticketType.additionalProperty,
                price: unitPriceSpec.price,
                priceCurrency: factory.priceCurrency.JPY,
                ticket_type: ticketType.id,
                ticket_type_name: <any>ticketType.name,
                ticket_type_charge: unitPriceSpec.price,
                itemOffered: {
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
                    // transaction: transactionId,
                    // seat_code: selectedSeat.branchCode,
                    // ticket_type: ticketType.id,
                    // ticket_type_name: <any>ticketType.name,
                    // ticket_type_charge: unitPriceSpec.price,
                    // charge: unitPriceSpec.price,
                    // watcher_name: offer.watcher_name
                }
            });

            selectedSeatsForAdditionalStocks.forEach((s) => {
                acceptedOffersWithSeatNumber.push({
                    ...offer,
                    additionalProperty: ticketType.additionalProperty,
                    price: unitPriceSpec.price,
                    priceCurrency: factory.priceCurrency.JPY,
                    ticket_type: ticketType.id,
                    ticket_type_name: <any>ticketType.name,
                    ticket_type_charge: unitPriceSpec.price,
                    itemOffered: {
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
                        // transaction: transactionId,
                        // seat_code: s.branchCode,
                        // ticket_type: ticketType.id,
                        // ticket_type_name: <any>ticketType.name,
                        // ticket_type_charge: unitPriceSpec.price,
                        // charge: 0,
                        // watcher_name: offer.watcher_name
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
        paymentNoRepo: PaymentNoRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo,
        stockRepo: StockRepo,
        taskRepo: TaskRepo
    ): Promise<factory.action.authorize.seatReservation.IAction> => {
        debug('creating seatReservation authorizeAction...acceptedOffers:', acceptedOffers.length);

        const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // パフォーマンスを取得
        const performance = await performanceRepo.findById(perfomanceId);

        // 供給情報の有効性を確認
        const acceptedOffersWithSeatNumber = await validateOffers(performance, acceptedOffers, transactionId)({ stock: stockRepo });

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
        let tmpReservationsWithoutExtra: factory.action.authorize.seatReservation.ITmpReservation[] = [];

        const performanceStartDate = moment(performance.startDate).toDate();

        try {
            // この時点でトークンに対して購入番号発行(上映日が決まれば購入番号を発行できる)
            const reservationNumber = await paymentNoRepo.publish(moment(performance.startDate).tz('Asia/Tokyo').format('YYYYMMDD'));

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

            // 仮予約作成
            // 座席ロック
            await stockRepo.lock({
                eventId: performance.id,
                offers: acceptedOffersWithSeatNumber.map((o) => {
                    const ticketedSeat = o.itemOffered.reservedTicket.ticketedSeat;
                    if (ticketedSeat === undefined) {
                        throw new Error('ticketedSeat undefined');
                    }

                    return {
                        seatSection: ticketedSeat.seatSection,
                        seatNumber: ticketedSeat.seatNumber
                    };
                }),
                expires: moment(performance.endDate).add(1, 'month').toDate(),
                holder: transactionId
            });

            tmpReservations = acceptedOffersWithSeatNumber.map((o) => {
                return {
                    ...o.itemOffered,
                    reservationNumber: reservationNumber
                };
            });
            debug(tmpReservations.length, 'tmp reservation(s) created');

            // 予約枚数が指定枚数に達しなかった場合エラー
            tmpReservationsWithoutExtra = tmpReservations
                .filter((r) => {
                    // 余分確保分を除く
                    let extraProperty: factory.propertyValue.IPropertyValue<string> | undefined;
                    if (r.additionalProperty !== undefined) {
                        extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                    }

                    return r.additionalProperty === undefined
                        || extraProperty === undefined
                        || extraProperty.value !== '1';
                });
            debug(tmpReservationsWithoutExtra.length, 'tmp reservation(s) created without extra');
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
                await removeTmpReservations(transactionId, tmpReservations, performance)({ stock: stockRepo });

                // 車椅子のレート制限カウント数が車椅子要求数以下であれば、このアクションのために枠確保済なので、それを解放
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
                runsAt: new Date(),
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
        return seatReservationAuthorizeActionRepo.complete(
            action.id,
            {
                price: tmpReservations.reduce(
                    (a, b) => {
                        const unitPriceSpec = b.reservedTicket.ticketType.priceSpecification;
                        const unitPrice = (unitPriceSpec !== undefined) ? unitPriceSpec.price : 0;

                        return a + unitPrice;
                    },
                    0
                ),
                tmpReservations: tmpReservations
            }
        );
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
        stockRepo: StockRepo,
        taskRepo: TaskRepo
    ) => {
        try {
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
            await removeTmpReservations(transactionId, actionResult.tmpReservations, performance)({ stock: stockRepo });

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
                runsAt: new Date(),
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

/**
 * 仮予約データから在庫確保を取り消す
 */
function removeTmpReservations(
    transactionId: string,
    tmpReservations: factory.action.authorize.seatReservation.ITmpReservation[],
    performance: factory.performance.IPerformanceWithDetails
) {
    return async (repos: {
        stock: StockRepo;
    }) => {
        await Promise.all(tmpReservations.map(async (tmpReservation) => {
            try {
                const ticketedSeat = tmpReservation.reservedTicket.ticketedSeat;
                if (ticketedSeat !== undefined) {
                    const lockKey = {
                        eventId: performance.id,
                        offer: {
                            seatNumber: ticketedSeat.seatNumber,
                            seatSection: ticketedSeat.seatSection
                        }
                    };
                    const holder = await repos.stock.getHolder(lockKey);
                    if (holder === transactionId) {
                        await repos.stock.unlock(lockKey);
                    }
                }
            } catch (error) {
                // no op
            }
        }));
    };
}
