/**
 * 進行中注文取引サービス
 */
import * as factory from '@motionpicture/ttts-factory';
import * as waiter from '@waiter/domain';
import * as createDebug from 'debug';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import * as moment from 'moment-timezone';

import { MongoRepository as CreditCardAuthorizeActionRepo } from '../../repo/action/authorize/creditCard';
import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../../repo/action/authorize/seatReservation';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { RedisRepository as TokenRepo } from '../../repo/token';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as CreditCardAuthorizeActionService from './placeOrderInProgress/action/authorize/creditCard';
import * as SeatReservationAuthorizeActionService from './placeOrderInProgress/action/authorize/seatReservation';

const debug = createDebug('ttts-domain:service');

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

export type IStartOperation<T> = (transactionRepo: TransactionRepo, sellerRepo: SellerRepo) => Promise<T>;
export type ITransactionOperation<T> = (transactionRepo: TransactionRepo) => Promise<T>;
export type IConfirmOperation<T> = (
    transactionRepo: TransactionRepo,
    creditCardAuthorizeActionRepo: CreditCardAuthorizeActionRepo,
    seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
    tokenRepo: TokenRepo
) => Promise<T>;

/**
 * 取引開始パラメーターインターフェース
 */
export interface IStartParams {
    /**
     * 取引期限
     */
    expires: Date;
    /**
     * 取引主体
     */
    agent: factory.person.IPerson;
    /**
     * 販売者識別子
     */
    sellerIdentifier: string;
    /**
     * APIクライアント
     */
    clientUser: factory.clientUser.IClientUser;
    /**
     * WAITER許可証トークン
     */
    passportToken?: waiter.factory.passport.IEncodedPassport;
    /**
     * 購入者区分
     */
    purchaserGroup: factory.person.Group;
}

/**
 * 取引開始
 */
export function start(params: IStartParams): IStartOperation<factory.transaction.placeOrder.ITransaction> {
    return async (transactionRepo: TransactionRepo, sellerRepo: SellerRepo) => {
        // 販売者を取得
        const doc = await sellerRepo.organizationModel.findOne({
            identifier: params.sellerIdentifier
        })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Seller');
        }

        const seller = <factory.organization.corporation.IOrganization>doc.toObject();

        let passport: waiter.factory.passport.IPassport | undefined;

        // WAITER許可証トークンがあれば検証する
        if (params.passportToken !== undefined) {
            try {
                passport = await waiter.service.passport.verify({
                    token: params.passportToken,
                    secret: <string>process.env.WAITER_SECRET
                });
            } catch (error) {
                throw new factory.errors.Argument('passportToken', `Invalid token. ${error.message}`);
            }

            // スコープを判別
            if (seller.identifier === undefined || !validatePassport(passport, seller.identifier)) {
                throw new factory.errors.Argument('passportToken', 'Invalid passport.');
            }
        }

        // const agent: factory.transaction.placeOrder.IAgent = {
        //     typeOf: factory.personType.Person,
        //     id: params.agent.id,
        //     url: ''
        // };
        // if (params.clientUser.username !== undefined) {
        //     agent.memberOf = {
        //         membershipNumber: params.agent.id,
        //         programName: 'Amazon Cognito',
        //         username: params.clientUser.username
        //     };
        // }

        // 新しい進行中取引を作成
        const transactionAttributes: factory.transaction.placeOrder.IAttributes = {
            typeOf: factory.transactionType.PlaceOrder,
            status: factory.transactionStatusType.InProgress,
            agent: params.agent,
            seller: {
                typeOf: factory.organizationType.Corporation,
                id: seller.id,
                name: seller.name.ja,
                url: seller.url
            },
            object: {
                passportToken: params.passportToken,
                passport: passport,
                clientUser: params.clientUser,
                purchaser_group: params.purchaserGroup,
                authorizeActions: []
            },
            expires: params.expires,
            startDate: new Date(),
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        };

        let transaction: factory.transaction.placeOrder.ITransaction;
        try {
            transaction = await transactionRepo.startPlaceOrder(transactionAttributes);
        } catch (error) {
            if (error.name === 'MongoError') {
                // 許可証を重複使用しようとすると、MongoDBでE11000 duplicate key errorが発生する
                // name: 'MongoError',
                // message: 'E11000 duplicate key error collection: ttts-development-v2.transactions...',
                // code: 11000,

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                // tslint:disable-next-line:no-magic-numbers
                if (error.code === 11000) {
                    throw new factory.errors.AlreadyInUse('transaction', ['passportToken'], 'Passport already used.');
                }
            }

            throw error;
        }

        return transaction;
    };
}

/**
 * WAITER許可証の有効性チェック
 * @param passport WAITER許可証
 * @param sellerIdentifier 販売者識別子
 */
function validatePassport(passport: waiter.factory.passport.IPassport, sellerIdentifier: string) {
    const WAITER_PASSPORT_ISSUER = process.env.WAITER_PASSPORT_ISSUER;
    if (WAITER_PASSPORT_ISSUER === undefined) {
        throw new Error('WAITER_PASSPORT_ISSUER unset');
    }
    const issuers = WAITER_PASSPORT_ISSUER.split(',');
    const validIssuer = issuers.indexOf(passport.iss) >= 0;

    // スコープのフォーマットは、placeOrderTransaction.{sellerId}
    const explodedScopeStrings = passport.scope.split('.');
    const validScope = (
        explodedScopeStrings[0] === 'placeOrderTransaction' && // スコープ接頭辞確認
        explodedScopeStrings[1] === sellerIdentifier // 販売者識別子確認
    );

    return validIssuer && validScope;
}

/**
 * 取引に対するアクション
 */
export namespace action {
    /**
     * 取引に対する承認アクション
     */
    export namespace authorize {
        /**
         * クレジットカード承認アクションサービス
         */
        export import creditCard = CreditCardAuthorizeActionService;
        /**
         * 座席予約承認アクションサービス
         */
        export import seatReservation = SeatReservationAuthorizeActionService;
    }
}

/**
 * 取引中の購入者情報を変更する
 */
export function setCustomerContact(
    agentId: string,
    transactionId: string,
    contact: factory.transaction.placeOrder.ICustomerContact
): ITransactionOperation<factory.transaction.placeOrder.ICustomerContact> {
    return async (transactionRepo: TransactionRepo) => {
        let formattedTelephone: string;
        try {
            const phoneUtil = PhoneNumberUtil.getInstance();
            // addressが国コード
            const phoneNumber = phoneUtil.parse(contact.tel, contact.address);
            if (!phoneUtil.isValidNumber(phoneNumber)) {
                throw new Error('invalid phone number format.');
            }

            formattedTelephone = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
        } catch (error) {
            throw new factory.errors.Argument('contact.telephone', error.message);
        }

        // 連絡先を再生成(validationの意味も含めて)
        const customerContact: factory.transaction.placeOrder.ICustomerContact = {
            last_name: contact.last_name,
            first_name: contact.first_name,
            email: contact.email,
            tel: formattedTelephone,
            age: contact.age,
            address: contact.address,
            gender: contact.gender,
            givenName: contact.first_name,
            familyName: contact.last_name,
            telephone: formattedTelephone
        };

        const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // await transactionRepo.setCustomerContactOnPlaceOrderInProgress(transactionId, customerContact);
        await transactionRepo.updateCustomerProfile({
            typeOf: transaction.typeOf,
            id: transaction.id,
            agent: customerContact
        });

        return customerContact;
    };
}

/**
 * 取引確定
 */
export function confirm(params: {
    agentId: string;
    transactionId: string;
    paymentMethod: factory.paymentMethodType;
}): IConfirmOperation<factory.transaction.placeOrder.IResult> {
    return async (
        transactionRepo: TransactionRepo,
        creditCardAuthorizeActionRepo: CreditCardAuthorizeActionRepo,
        seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
        tokenRepo: TokenRepo
    ) => {
        const now = new Date();
        const transaction = await transactionRepo.findPlaceOrderInProgressById(params.transactionId);
        if (transaction.agent.id !== params.agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // 取引に対する全ての承認アクションをマージ
        let authorizeActions = [
            ... await creditCardAuthorizeActionRepo.findByTransactionId(params.transactionId),
            ... await seatReservationAuthorizeActionRepo.findByTransactionId(params.transactionId)
        ];

        // 万が一このプロセス中に他処理が発生してもそれらを無視するように、endDateでフィルタリング
        authorizeActions = authorizeActions.filter(
            (authorizeAction) => (authorizeAction.endDate !== undefined && authorizeAction.endDate < now)
        );
        transaction.object.authorizeActions = authorizeActions;
        transaction.object.paymentMethod = params.paymentMethod;

        // 注文取引成立条件を満たしているかどうか
        if (!canBeClosed(transaction)) {
            throw new factory.errors.Argument('transactionId', 'Transaction cannot be confirmed because prices are not matched.');
        }

        // 結果作成
        transaction.result = createResult(transaction);

        // 印刷トークンを発行
        const printToken = await tokenRepo.createPrintToken(
            transaction.result.order.acceptedOffers
                // 余分確保を除く
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
                .map((o) => o.itemOffered.id)
        );
        debug('printToken created.', printToken);
        transaction.result.printToken = printToken;

        // ステータス変更
        debug('updating transaction...');

        try {
            await transactionRepo.confirmPlaceOrder(
                params.transactionId,
                now,
                params.paymentMethod,
                authorizeActions,
                transaction.result
            );
        } catch (error) {
            if (error.name === 'MongoError') {
                // 万が一同一注文番号で確定しようとすると、MongoDBでE11000 duplicate key errorが発生する
                // name: 'MongoError',
                // message: 'E11000 duplicate key error collection: prodttts.transactions index:result.order.orderNumber_1 dup key:...',
                // code: 11000,
                // tslint:disable-next-line:no-magic-numbers
                if (error.code === 11000) {
                    throw new factory.errors.AlreadyInUse('transaction', ['result.order.orderNumber']);
                }
            }

            throw error;
        }

        return transaction.result;
    };
}

/**
 * 取引が確定可能な状態かどうかをチェックする
 */
function canBeClosed(transaction: factory.transaction.placeOrder.ITransaction) {
    const paymentMethod = transaction.object.paymentMethod;
    const purchaserGroup = transaction.object.purchaser_group;
    const agent = transaction.agent;
    const creditCardAuthorizeActions = transaction.object.authorizeActions
        .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((a) => a.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.CreditCard);

    switch (paymentMethod) {
        case factory.paymentMethodType.Cash:
            break;

        case factory.paymentMethodType.CreditCard:
            // 決済方法がクレジットカードであれば、承認アクションが必須
            if (creditCardAuthorizeActions.length === 0) {
                throw new factory.errors.Argument('paymentMethod', 'Credit card authorization required.');
            }

            break;

        case factory.paymentMethodType.Charter:
        case factory.paymentMethodType.CP:
        case factory.paymentMethodType.GroupReservation:
        case factory.paymentMethodType.Invitation:
        case factory.paymentMethodType.Invoice:
        case factory.paymentMethodType.OTC:
            // 認められるのはスタッフだけ(CognitoUserログインしているはず)
            if (purchaserGroup !== factory.person.Group.Staff || agent.memberOf === undefined) {
                throw new factory.errors.Argument('paymentMethod', `Invalid payment method for ${purchaserGroup}.`);
            }

            break;

        default:
            // それ以外の決済方法は認められない
            throw new factory.errors.Argument('paymentMethod', 'Invalid payment method.');
    }

    type IAuthorizeActionResult =
        factory.action.authorize.creditCard.IResult |
        factory.action.authorize.seatReservation.IResult;

    if (purchaserGroup === factory.person.Group.Customer && paymentMethod === factory.paymentMethodType.CreditCard) {
        // agentとsellerで、承認アクションの金額が合うかどうか
        const priceByAgent = transaction.object.authorizeActions
            .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((authorizeAction) => authorizeAction.agent.id === transaction.agent.id)
            .reduce((a, b) => a + (<IAuthorizeActionResult>b.result).price, 0);
        const priceBySeller = transaction.object.authorizeActions
            .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((authorizeAction) => authorizeAction.agent.id === transaction.seller.id)
            .reduce((a, b) => a + (<IAuthorizeActionResult>b.result).price, 0);
        debug('priceByAgent priceBySeller:', priceByAgent, priceBySeller);

        // 決済金額なし
        if (priceByAgent !== priceBySeller) {
            throw new factory.errors.Argument('transactionId', 'Prices not matched between an agent and a seller.');
        }
    }

    return true;
}

/**
 * 注文取引結果を作成する
 */
// tslint:disable-next-line:max-func-body-length
export function createResult(transaction: factory.transaction.placeOrder.ITransaction): factory.transaction.placeOrder.IResult {
    debug('creating result of transaction...', transaction.id);
    const seatReservationAuthorizeAction = <factory.action.authorize.seatReservation.IAction>transaction.object.authorizeActions
        .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .find((authorizeAction) => authorizeAction.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.SeatReservation);
    const creditCardAuthorizeAction = <factory.action.authorize.creditCard.IAction | undefined>transaction.object.authorizeActions
        .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .find((authorizeAction) => authorizeAction.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.CreditCard);

    const tmpReservations = (<factory.action.authorize.seatReservation.IResult>seatReservationAuthorizeAction.result).tmpReservations;
    const performance = seatReservationAuthorizeAction.object.performance;
    const customerContact = <factory.transaction.placeOrder.ICustomerContact>transaction.object.customerContact;
    const orderDate = new Date();

    if (transaction.object.paymentMethod === undefined) {
        throw new Error('PaymentMethod undefined.');
    }

    // 注文番号を作成
    const orderNumber = `TT-${moment(performance.startDate).tz('Asia/Tokyo').format('YYMMDD')}-${tmpReservations[0].reservationNumber}`;
    const gmoOrderId = (creditCardAuthorizeAction !== undefined) ? creditCardAuthorizeAction.object.orderId : '';

    // 予約データを作成
    const eventReservations = tmpReservations.map((tmpReservation, index) => {
        return temporaryReservation2confirmed({
            tmpReservation: tmpReservation,
            event: performance,
            transaction: transaction,
            orderNumber: orderNumber,
            gmoOrderId: gmoOrderId,
            paymentSeatIndex: index.toString(),
            customerContact: customerContact,
            bookingTime: orderDate
        });
    });

    const paymentMethods = [{
        typeOf: transaction.object.paymentMethod,
        name: transaction.object.paymentMethod.toString(),
        paymentMethod: transaction.object.paymentMethod,
        paymentMethodId: (transaction.object.paymentMethod === factory.paymentMethodType.CreditCard) ? gmoOrderId : '',
        additionalProperty: []
    }];

    const price = eventReservations
        .reduce(
            (a, b) => {
                const unitPrice = (b.reservedTicket.ticketType.priceSpecification !== undefined)
                    ? b.reservedTicket.ticketType.priceSpecification.price
                    : 0;

                return a + unitPrice;
            },
            0
        );

    const customerIdentifier = (Array.isArray(transaction.agent.identifier)) ? transaction.agent.identifier : [];
    const customer: factory.order.ICustomer = {
        typeOf: transaction.agent.typeOf,
        id: transaction.agent.id,
        name: `${customerContact.first_name} ${customerContact.last_name}`,
        ...customerContact,
        identifier: customerIdentifier
    };

    const orderInquiryKey: factory.order.IOrderInquiryKey = {
        performanceDay: moment(performance.startDate).tz('Asia/Tokyo').format('YYYYMMDD'),
        paymentNo: eventReservations[0].reservationNumber,
        // 連絡先情報がないケースは、とりあえず固定で(電話番号で照会されることは現時点でない)
        // tslint:disable-next-line:no-magic-numbers
        telephone: (customerContact !== undefined) ? customerContact.tel.slice(-4) : '9999' // 電話番号下4桁
    };

    const confirmationNumber: string = `${orderInquiryKey.performanceDay}${orderInquiryKey.paymentNo}`;

    return {
        order: {
            typeOf: 'Order',
            seller: {
                id: transaction.seller.id,
                typeOf: transaction.seller.typeOf,
                name: transaction.seller.name,
                url: (transaction.seller.url !== undefined) ? transaction.seller.url : ''
            },
            customer: customer,
            acceptedOffers: eventReservations.map((r) => {
                const unitPrice = (r.reservedTicket.ticketType.priceSpecification !== undefined)
                    ? r.reservedTicket.ticketType.priceSpecification.price
                    : 0;

                return {
                    itemOffered: r,
                    price: unitPrice,
                    priceCurrency: factory.priceCurrency.JPY,
                    seller: {
                        typeOf: transaction.seller.typeOf,
                        name: transaction.seller.name
                    }
                };
            }),
            confirmationNumber: confirmationNumber,
            orderNumber: orderNumber,
            price: price,
            priceCurrency: factory.priceCurrency.JPY,
            paymentMethods: paymentMethods,
            discounts: [],
            url: '',
            orderStatus: factory.orderStatus.OrderDelivered,
            orderDate: orderDate,
            isGift: false,
            orderInquiryKey: orderInquiryKey
        },
        printToken: ''
    };
}

/**
 * 仮予約から確定予約を生成する
 */
// tslint:disable-next-line:max-func-body-length
function temporaryReservation2confirmed(params: {
    tmpReservation: factory.action.authorize.seatReservation.ITmpReservation;
    event: factory.performance.IPerformanceWithDetails;
    transaction: factory.transaction.placeOrder.ITransaction;
    orderNumber: string;
    gmoOrderId: string;
    paymentSeatIndex: string;
    customerContact: factory.transaction.placeOrder.ICustomerContact;
    bookingTime: Date;
}): factory.reservation.event.IReservation {
    const transaction = params.transaction;
    const customerContact = params.customerContact;
    const performance = params.event;

    const id = `${params.orderNumber}-${params.paymentSeatIndex}`;

    const unitPriceSpec = params.tmpReservation.reservedTicket.ticketType.priceSpecification;

    const compoundPriceSpec: factory.chevre.reservation.IPriceSpecification<factory.chevre.reservationType.EventReservation> = {
        project: project,
        typeOf: <factory.chevre.priceSpecificationType.CompoundPriceSpecification>
            factory.chevre.priceSpecificationType.CompoundPriceSpecification,
        priceCurrency: factory.priceCurrency.JPY,
        valueAddedTaxIncluded: true,
        priceComponent: [
            ...(unitPriceSpec !== undefined) ? [unitPriceSpec] : []
        ]
    };

    const underName: factory.chevre.reservation.IUnderName<factory.chevre.reservationType.EventReservation> = {
        typeOf: factory.personType.Person,
        id: params.transaction.agent.id,
        name: `${customerContact.first_name} ${customerContact.last_name}`,
        familyName: customerContact.last_name,
        givenName: customerContact.first_name,
        email: customerContact.email,
        telephone: customerContact.telephone,
        gender: customerContact.gender,
        identifier: [
            { name: 'age', value: customerContact.age },
            { name: 'orderNumber', value: params.orderNumber },
            { name: 'transaction', value: transaction.id },
            { name: 'gmoOrderId', value: params.gmoOrderId },
            ...(transaction.agent.identifier !== undefined) ? transaction.agent.identifier : [],
            ...(transaction.agent.memberOf !== undefined && transaction.agent.memberOf.membershipNumber !== undefined)
                ? [{ name: 'username', value: transaction.agent.memberOf.membershipNumber }]
                : [],
            ...(transaction.object.paymentMethod !== undefined)
                ? [{ name: 'paymentMethod', value: transaction.object.paymentMethod }]
                : []
        ],
        ...{ address: customerContact.address }
    };

    const reservedTicket: factory.chevre.reservation.ITicket<factory.chevre.reservationType.EventReservation> = {
        typeOf: 'Ticket',
        dateIssued: params.bookingTime,
        issuedBy: {
            typeOf: transaction.seller.typeOf,
            name: transaction.seller.name
        },
        totalPrice: compoundPriceSpec,
        priceCurrency: factory.priceCurrency.JPY,
        ticketedSeat: params.tmpReservation.reservedTicket.ticketedSeat,
        underName: underName,
        ticketType: params.tmpReservation.reservedTicket.ticketType
    };

    const reservationFor: factory.chevre.event.IEvent<factory.chevre.eventType.ScreeningEvent> = {
        project: project,
        typeOf: factory.chevre.eventType.ScreeningEvent,
        id: performance.id,
        name: performance.superEvent.name,
        eventStatus: factory.chevre.eventStatusType.EventScheduled,
        doorTime: moment(performance.doorTime).toDate(),
        startDate: moment(performance.startDate).toDate(),
        endDate: moment(performance.endDate).toDate(),
        superEvent: {
            project: project,
            typeOf: factory.chevre.eventType.ScreeningEventSeries,
            id: '',
            eventStatus: factory.chevre.eventStatusType.EventScheduled,
            kanaName: '',
            name: performance.superEvent.name,
            videoFormat: [],
            soundFormat: [],
            workPerformed: (performance.superEvent.workPerformed !== undefined && performance.superEvent.workPerformed !== null)
                ? performance.superEvent.workPerformed
                : {
                    project: project,
                    typeOf: factory.chevre.creativeWorkType.Movie,
                    identifier: performance.superEvent.id,
                    id: performance.superEvent.id,
                    name: performance.superEvent.name.ja
                },
            location: {
                project: project,
                typeOf: factory.chevre.placeType.MovieTheater,
                id: performance.superEvent.location.id,
                branchCode: performance.superEvent.location.branchCode,
                name: performance.superEvent.location.name,
                kanaName: ''
            }

        },
        workPerformed: (performance.superEvent.workPerformed !== undefined && performance.superEvent.workPerformed !== null)
            ? performance.superEvent.workPerformed
            : {
                project: project,
                typeOf: factory.chevre.creativeWorkType.Movie,
                identifier: performance.superEvent.id,
                id: performance.superEvent.id,
                name: performance.superEvent.name.ja
            },
        location: {
            project: project,
            typeOf: factory.chevre.placeType.ScreeningRoom,
            branchCode: performance.location.branchCode,
            name: performance.location.name
        },
        offers: <any>{
            typeOf: 'Offer',
            id: performance.ticket_type_group.id,
            name: performance.ticket_type_group.name,
            itemOffered: {
                serviceType: {
                    typeOf: 'ServiceType',
                    id: '',
                    name: ''
                }
            }
        },
        checkInCount: 0,
        attendeeCount: 0,
        additionalProperty: performance.additionalProperty
    };

    return {
        project: project,
        typeOf: factory.reservationType.EventReservation,

        additionalProperty: [
            ...(Array.isArray(params.tmpReservation.additionalProperty)) ? params.tmpReservation.additionalProperty : [],
            { name: 'paymentSeatIndex', value: params.paymentSeatIndex }
        ],

        additionalTicketText: params.tmpReservation.additionalTicketText,
        bookingTime: params.bookingTime,
        modifiedTime: params.bookingTime,
        numSeats: 1,
        price: compoundPriceSpec,
        priceCurrency: factory.priceCurrency.JPY,
        reservationFor: reservationFor,
        reservationNumber: params.tmpReservation.reservationNumber,
        reservationStatus: factory.reservationStatusType.ReservationConfirmed,
        reservedTicket: reservedTicket,
        underName: underName,
        checkedIn: false,
        attended: false,

        id: id,

        checkins: []
    };
}
