/**
 * 進行中注文取引サービス
 */
import * as factory from '@tokyotower/factory';
import * as waiter from '@waiter/domain';
import * as createDebug from 'debug';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import * as moment from 'moment-timezone';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { RedisRepository as PaymentNoRepo } from '../../repo/paymentNo';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { RedisRepository as TokenRepo } from '../../repo/token';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as SeatReservationAuthorizeActionService from './placeOrderInProgress/action/authorize/seatReservation';

const debug = createDebug('ttts-domain:service');

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

export type IStartOperation<T> = (transactionRepo: TransactionRepo, sellerRepo: SellerRepo) => Promise<T>;
export type ITransactionOperation<T> = (transactionRepo: TransactionRepo) => Promise<T>;
export type IConfirmOperation<T> = (
    transactionRepo: TransactionRepo,
    actionRepo: ActionRepo,
    tokenRepo: TokenRepo,
    paymentNoRepo: PaymentNoRepo
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

        const seller = <factory.seller.IOrganization<factory.seller.IAttributes<factory.organizationType.Corporation>>>doc.toObject();

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

        // 新しい進行中取引を作成
        const transactionAttributes: factory.transaction.placeOrder.IAttributes = {
            project: project,
            typeOf: factory.transactionType.PlaceOrder,
            status: factory.transactionStatusType.InProgress,
            agent: params.agent,
            seller: {
                typeOf: seller.typeOf,
                id: seller.id,
                name: seller.name,
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
    // tslint:disable-next-line:max-func-body-length
    return async (
        transactionRepo: TransactionRepo,
        actionRepo: ActionRepo,
        tokenRepo: TokenRepo,
        paymentNoRepo: PaymentNoRepo
    ) => {
        const now = new Date();
        const transaction = await transactionRepo.findPlaceOrderInProgressById(params.transactionId);
        if (transaction.agent.id !== params.agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // 取引に対する全ての承認アクションをマージ
        let authorizeActions = await actionRepo.searchByPurpose({
            typeOf: factory.actionType.AuthorizeAction,
            purpose: {
                typeOf: factory.transactionType.PlaceOrder,
                id: params.transactionId
            }
        });

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

        // 購入番号発行
        const seatReservationAuthorizeAction = <factory.action.authorize.seatReservation.IAction | undefined>
            transaction.object.authorizeActions
                .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                .find((a) => a.object.typeOf === factory.action.authorize.seatReservation.ObjectType.SeatReservation);
        if (seatReservationAuthorizeAction === undefined) {
            throw new factory.errors.Argument('transactionId', 'Authorize seat reservation action not found');
        }
        const performance = seatReservationAuthorizeAction.object.performance;
        const paymentNo = await paymentNoRepo.publish(moment(performance.startDate).tz('Asia/Tokyo').format('YYYYMMDD'));

        // 注文作成
        const { order } = createResult(paymentNo, transaction);
        transaction.result = { order };

        const potentialActions: factory.cinerino.transaction.placeOrder.IPotentialActions = {
            order: {
                project: transaction.project,
                typeOf: factory.actionType.OrderAction,
                object: order,
                agent: transaction.agent,
                // potentialActions: {
                //     payCreditCard: payCreditCardActions,
                // },
                purpose: <any>{
                    typeOf: transaction.typeOf,
                    id: transaction.id
                }
            }
        };

        // 印刷トークンを発行
        const printToken = await tokenRepo.createPrintToken(
            transaction.result.order.acceptedOffers.map((o) => o.itemOffered.id)
        );
        debug('printToken created.', printToken);

        // ステータス変更
        debug('updating transaction...');

        try {
            await transactionRepo.confirmPlaceOrder(
                params.transactionId,
                now,
                params.paymentMethod,
                authorizeActions,
                transaction.result,
                potentialActions
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

        return {
            order: transaction.result.order,
            printToken: printToken
        };
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
        .filter((a) => (<any>a.object).typeOf === factory.paymentMethodType.CreditCard);

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
        // customerとsellerで、承認アクションの金額が合うかどうか
        const priceByAgent = transaction.object.authorizeActions
            .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.agent.id === transaction.agent.id)
            .reduce((a, b) => a + Number((<any>b.result).amount), 0);
        const priceBySeller = transaction.object.authorizeActions
            .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.agent.id === transaction.seller.id)
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
export function createResult(
    paymentNo: string,
    transaction: factory.transaction.placeOrder.ITransaction
): factory.transaction.placeOrder.IResult {
    debug('creating result of transaction...', transaction.id);
    const seatReservationAuthorizeAction = <factory.action.authorize.seatReservation.IAction>transaction.object.authorizeActions
        .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .find((a) => a.object.typeOf === factory.action.authorize.seatReservation.ObjectType.SeatReservation);
    const creditCardAuthorizeAction = <factory.action.authorize.creditCard.IAction | undefined>transaction.object.authorizeActions
        .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .find((a) => a.object.typeOf === factory.paymentMethodType.CreditCard);

    const authorizeSeatReservationResult = <factory.action.authorize.seatReservation.IResult>seatReservationAuthorizeAction.result;
    const reserveTransaction = authorizeSeatReservationResult.responseBody;
    if (reserveTransaction === undefined) {
        throw new factory.errors.Argument('Transaction', 'Reserve Transaction undefined');
    }

    const tmpReservations = (<factory.action.authorize.seatReservation.IResult>seatReservationAuthorizeAction.result).tmpReservations;
    const chevreReservations = reserveTransaction.object.reservations;
    const performance = seatReservationAuthorizeAction.object.performance;
    const customerContact = <factory.transaction.placeOrder.ICustomerContact>transaction.object.customerContact;
    const orderDate = new Date();

    if (transaction.object.paymentMethod === undefined) {
        throw new Error('PaymentMethod undefined.');
    }

    // 注文番号を作成
    const orderNumber = `TT-${moment(performance.startDate).tz('Asia/Tokyo').format('YYMMDD')}-${paymentNo}`;
    let paymentMethodId = '';
    let paymentAccountId = '';
    if (creditCardAuthorizeAction !== undefined && creditCardAuthorizeAction.result !== undefined) {
        paymentAccountId = creditCardAuthorizeAction.result.accountId;
        paymentMethodId = creditCardAuthorizeAction.result.paymentMethodId;
    }

    // 予約データを作成
    const eventReservations = tmpReservations.map((tmpReservation, index) => {
        const chevreReservation = chevreReservations.find((r) => r.id === tmpReservation.id);
        if (chevreReservation === undefined) {
            throw new factory.errors.Argument('Transaction', `Unexpected temporary reservation: ${tmpReservation.id}`);
        }

        return temporaryReservation2confirmed({
            tmpReservation: tmpReservation,
            chevreReservation: chevreReservation,
            transaction: transaction,
            orderNumber: orderNumber,
            paymentNo: paymentNo,
            gmoOrderId: paymentMethodId,
            paymentSeatIndex: index.toString(),
            customerContact: customerContact,
            bookingTime: orderDate
        });
    });

    const acceptedOffers: factory.order.IAcceptedOffer<factory.order.IItemOffered>[] = eventReservations.map((r) => {
        const unitPrice = (r.reservedTicket.ticketType.priceSpecification !== undefined)
            ? r.reservedTicket.ticketType.priceSpecification.price
            : 0;

        return {
            typeOf: 'Offer',
            itemOffered: r,
            price: unitPrice,
            priceCurrency: factory.priceCurrency.JPY,
            seller: {
                typeOf: transaction.seller.typeOf,
                name: transaction.seller.name.ja
            }
        };
    });

    const price: number = eventReservations.reduce(
        (a, b) => {
            const unitPrice = (b.reservedTicket.ticketType.priceSpecification !== undefined)
                ? b.reservedTicket.ticketType.priceSpecification.price
                : 0;

            return a + unitPrice;
        },
        0
    );

    const paymentMethods = [{
        typeOf: transaction.object.paymentMethod,
        name: transaction.object.paymentMethod.toString(),
        paymentMethod: transaction.object.paymentMethod,
        accountId: paymentAccountId,
        paymentMethodId: paymentMethodId,
        additionalProperty: [],
        totalPaymentDue: {
            typeOf: <'MonetaryAmount'>'MonetaryAmount',
            currency: factory.priceCurrency.JPY,
            value: price
        }
    }];

    const customerIdentifier = (Array.isArray(transaction.agent.identifier)) ? transaction.agent.identifier : [];
    const customer: factory.order.ICustomer = {
        typeOf: transaction.agent.typeOf,
        id: transaction.agent.id,
        name: `${customerContact.first_name} ${customerContact.last_name}`,
        ...customerContact,
        identifier: customerIdentifier
    };

    const confirmationNumber: string = `${moment(performance.startDate).tz('Asia/Tokyo').format('YYYYMMDD')}${paymentNo}`;

    return {
        order: {
            project: project,
            typeOf: 'Order',
            seller: {
                id: transaction.seller.id,
                typeOf: transaction.seller.typeOf,
                name: transaction.seller.name.ja,
                url: (transaction.seller.url !== undefined) ? transaction.seller.url : ''
            },
            customer: customer,
            acceptedOffers: acceptedOffers,
            confirmationNumber: confirmationNumber,
            orderNumber: orderNumber,
            price: price,
            priceCurrency: factory.priceCurrency.JPY,
            paymentMethods: paymentMethods,
            discounts: [],
            url: '',
            orderStatus: factory.orderStatus.OrderDelivered,
            orderDate: orderDate,
            isGift: false
        }
    };
}

/**
 * 仮予約から確定予約を生成する
 */
function temporaryReservation2confirmed(params: {
    tmpReservation: factory.action.authorize.seatReservation.ITmpReservation;
    chevreReservation: factory.chevre.reservation.IReservation<factory.chevre.reservationType.EventReservation>;
    transaction: factory.transaction.placeOrder.ITransaction;
    orderNumber: string;
    paymentNo: string;
    gmoOrderId: string;
    paymentSeatIndex: string;
    customerContact: factory.transaction.placeOrder.ICustomerContact;
    bookingTime: Date;
}): factory.chevre.reservation.IReservation<factory.chevre.reservationType.EventReservation> {
    const transaction = params.transaction;
    const customerContact = params.customerContact;

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
            { name: 'paymentNo', value: params.paymentNo },
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

    return {
        ...params.chevreReservation,

        reservationFor: {
            ...params.chevreReservation.reservationFor,
            doorTime: moment(params.chevreReservation.reservationFor.doorTime).toDate(),
            endDate: moment(params.chevreReservation.reservationFor.endDate).toDate(),
            startDate: moment(params.chevreReservation.reservationFor.startDate).toDate()
        },
        bookingTime: moment(params.bookingTime).toDate(),
        reservationStatus: factory.chevre.reservationStatusType.ReservationConfirmed,
        underName: underName,
        additionalProperty: [
            ...(Array.isArray(params.tmpReservation.additionalProperty)) ? params.tmpReservation.additionalProperty : [],
            { name: 'paymentSeatIndex', value: params.paymentSeatIndex }
        ],
        additionalTicketText: params.tmpReservation.additionalTicketText
    };
}
