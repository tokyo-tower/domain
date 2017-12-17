/**
 * placeOrder in progress transaction service
 * 進行中注文取引サービス
 * @namespace service.transaction.placeOrderInProgress
 */

import * as waiter from '@motionpicture/waiter-domain';
import * as createDebug from 'debug';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import * as factory from '../../factory';
import { MongoRepository as CreditCardAuthorizeActionRepo } from '../../repo/action/authorize/creditCard';
import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../../repo/action/authorize/seatReservation';
import { MongoRepository as OwnerRepo } from '../../repo/owner';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as CreditCardAuthorizeActionService from './placeOrderInProgress/action/authorize/creditCard';
import * as SeatReservationAuthorizeActionService from './placeOrderInProgress/action/authorize/seatReservation';

const debug = createDebug('ttts-domain:service:transaction:placeOrderInProgress');

/**
 * 取引開始パラメーターインターフェース
 * @interface
 * @memberof service.transaction.placeOrderInProgress
 */
export interface IStartParams {
    /**
     * 取引期限
     */
    expires: Date;
    /**
     * 取引主体ID
     */
    agentId: string;
    /**
     * 販売者ID
     */
    sellerId: string;
    /**
     * WAITER許可証トークン
     */
    passportToken?: waiter.factory.passport.IEncodedPassport;
    /**
     * 購入者区分
     */
    purchaserGroup: string;
}

/**
 * 取引開始
 * @function
 * @memberof service.transaction.placeOrderInProgress
 */
export async function start(params: IStartParams): Promise<factory.transaction.placeOrder.ITransaction> {
    const transactionRepo = new TransactionRepo(mongoose.connection);
    const ownerRepo = new OwnerRepo(mongoose.connection);

    // 売り手を取得
    // const seller = await organizationRepo.findMovieTheaterById(params.sellerId);
    const seller = {
        id: params.sellerId,
        identifier: '',
        url: '',
        name: { ja: '', en: '' }
    };

    let passport: waiter.factory.passport.IPassport | undefined;

    // WAITER許可証トークンがあれば検証する
    if (params.passportToken !== undefined) {
        try {
            passport = await waiter.service.passport.verify(params.passportToken, <string>process.env.WAITER_SECRET);
        } catch (error) {
            throw new factory.errors.Argument('passportToken', `Invalid token. ${error.message}`);
        }

        // スコープを判別
        if (!validatePassport(passport, seller.identifier)) {
            throw new factory.errors.Argument('passportToken', 'Invalid passport.');
        }
    }

    let agent: factory.transaction.placeOrder.IAgent = {
        id: params.agentId,
        url: ''
    };
    if (params.agentId !== '') {
        // 会員情報取得
        agent = await ownerRepo.findById(params.agentId);
    }

    // 取引ファクトリーで新しい進行中取引オブジェクトを作成
    const transactionAttributes = factory.transaction.placeOrder.createAttributes({
        status: factory.transactionStatusType.InProgress,
        agent: agent,
        seller: {
            typeOf: factory.organizationType.Corporation,
            id: seller.id,
            name: seller.name.ja,
            url: seller.url
        },
        object: {
            passportToken: params.passportToken,
            passport: passport,
            purchaser_group: params.purchaserGroup,
            authorizeActions: []
        },
        expires: params.expires,
        startDate: new Date(),
        tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
    });

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
}

/**
 * WAITER許可証の有効性チェック
 * @function
 * @param passport WAITER許可証
 * @param sellerIdentifier 販売者識別子
 */
function validatePassport(passport: waiter.factory.passport.IPassport, sellerIdentifier: string) {
    // スコープのフォーマットは、placeOrderTransaction.{sellerId}
    const explodedScopeStrings = passport.scope.split('.');

    return (
        passport.iss === <string>process.env.WAITER_PASSPORT_ISSUER && // 許可証発行者確認
        // tslint:disable-next-line:no-magic-numbers
        explodedScopeStrings.length === 2 &&
        explodedScopeStrings[0] === 'placeOrderTransaction' && // スコープ接頭辞確認
        explodedScopeStrings[1] === sellerIdentifier // 販売者識別子確認
    );
}

/**
 * 取引に対するアクション
 * @export
 * @memberof service.transaction.placeOrderInProgress
 */
export namespace action {
    /**
     * 取引に対する承認アクション
     * @export
     * @memberof service.transaction.placeOrderInProgress.action
     */
    export namespace authorize {
        /**
         * クレジットカード承認アクションサービス
         * @export
         * @memberof service.transaction.placeOrderInProgress.action.authorize
         */
        export import creditCard = CreditCardAuthorizeActionService;
        /**
         * 座席予約承認アクションサービス
         * @export
         * @memberof service.transaction.placeOrderInProgress.action.authorize
         */
        export import seatReservation = SeatReservationAuthorizeActionService;
    }
}

/**
 * 取引中の購入者情報を変更する
 */
export async function setCustomerContact(
    agentId: string,
    transactionId: string,
    contact: factory.transaction.placeOrder.ICustomerContact
): Promise<factory.transaction.placeOrder.ICustomerContact> {
    const transactionRepo = new TransactionRepo(mongoose.connection);

    let formattedTelephone: string;
    try {
        const phoneUtil = PhoneNumberUtil.getInstance();
        const phoneNumber = phoneUtil.parse(contact.tel, 'JP'); // 日本の電話番号前提仕様
        if (!phoneUtil.isValidNumber(phoneNumber)) {
            throw new Error('invalid phone number format.');
        }

        formattedTelephone = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
    } catch (error) {
        throw new factory.errors.Argument('contact.telephone', error.message);
    }

    // 連絡先を再生成(validationの意味も含めて)
    contact = {
        last_name: contact.last_name,
        first_name: contact.first_name,
        email: contact.email,
        tel: formattedTelephone,
        age: contact.age,
        address: contact.address,
        gender: contact.gender
    };

    const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

    if (transaction.agent.id !== agentId) {
        throw new factory.errors.Forbidden('A specified transaction is not yours.');
    }

    await transactionRepo.setCustomerContactOnPlaceOrderInProgress(transactionId, contact);

    return contact;
}

/**
 * 取引確定
 */
export async function confirm(params: {
    agentId: string,
    transactionId: string,
    paymentMethod: factory.paymentMethodType
}): Promise<factory.transaction.placeOrder.ITransaction> {
    const transactionRepo = new TransactionRepo(mongoose.connection);
    const creditCardAuthorizeActionRepo = new CreditCardAuthorizeActionRepo(mongoose.connection);
    const seatReservationAuthorizeActionRepo = new SeatReservationAuthorizeActionRepo(mongoose.connection);

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

    // 照会可能になっているかどうか
    if (!canBeClosed(transaction)) {
        throw new factory.errors.Argument('transactionId', 'Transaction cannot be confirmed because prices are not matched.');
    }

    // 結果作成
    transaction.result = createResult(transaction);

    // ステータス変更
    debug('updating transaction...');
    await transactionRepo.confirmPlaceOrder(
        params.transactionId,
        now,
        params.paymentMethod,
        authorizeActions,
        transaction.result
    );

    return transaction;
}

/**
 * 取引が確定可能な状態かどうかをチェックする
 * @function
 * @returns {boolean}
 */
function canBeClosed(__: factory.transaction.placeOrder.ITransaction) {
    return true;

    // 決済方法がクレジットカードであれば、承認アクションが必須

    // tslint:disable-next-line:no-suspicious-comment
    // TODO validation
    // type IAuthorizeActionResult =
    //     factory.action.authorize.creditCard.IResult |
    //     factory.action.authorize.mvtk.IResult |
    //     factory.action.authorize.seatReservation.IResult;

    // // agentとsellerで、承認アクションの金額が合うかどうか
    // const priceByAgent = transaction.object.authorizeActions
    //     .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
    //     .filter((authorizeAction) => authorizeAction.agent.id === transaction.agent.id)
    //     .reduce((a, b) => a + (<IAuthorizeActionResult>b.result).price, 0);
    // const priceBySeller = transaction.object.authorizeActions
    //     .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
    //     .filter((authorizeAction) => authorizeAction.agent.id === transaction.seller.id)
    //     .reduce((a, b) => a + (<IAuthorizeActionResult>b.result).price, 0);
    // debug('priceByAgent priceBySeller:', priceByAgent, priceBySeller);

    // return (priceByAgent > 0 && priceByAgent === priceBySeller);
}

/**
 * 確定以外の全情報を確定するプロセスprocessAllExceptConfirm
 */
// tslint:disable-next-line:max-func-body-length
export function createResult(transaction: factory.transaction.placeOrder.ITransaction): factory.transaction.placeOrder.IResult {
    const seatReservationAuthorizeAction = <factory.action.authorize.seatReservation.IAction>transaction.object.authorizeActions
        .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .find((authorizeAction) => authorizeAction.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.SeatReservation);
    const creditCardAuthorizeAction = <factory.action.authorize.creditCard.IAction | undefined>transaction.object.authorizeActions
        .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .find((authorizeAction) => authorizeAction.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.CreditCard);

    const tmpReservations = (<factory.action.authorize.seatReservation.IResult>seatReservationAuthorizeAction.result).tmpReservations;
    const performance = (<factory.action.authorize.seatReservation.IObject>seatReservationAuthorizeAction.object).performance;
    const customerContact = <factory.transaction.placeOrder.ICustomerContact>transaction.object.customerContact;
    const now = moment();

    if (transaction.object.paymentMethod === undefined) {
        throw new Error('PaymentMethod undefined.');
    }

    // 注文番号を作成
    // tslint:disable-next-line:no-magic-numbers
    const orderNumber = `TT-${performance.day.slice(-6)}-${tmpReservations[0].payment_no}`;

    const gmoOrderId = (creditCardAuthorizeAction !== undefined) ? creditCardAuthorizeAction.object.orderId : '';

    // 予約データを作成
    const eventReservations: factory.reservation.event.IReservation[] = tmpReservations.map((tmpReservation, index) => {
        return {
            typeOf: factory.reservation.reservationType.EventReservation,
            transaction: transaction.id,
            order_number: orderNumber,
            stock: tmpReservation.stock,
            stock_availability_before: tmpReservation.stock_availability_before,
            stock_availability_after: tmpReservation.stock_availability_after,
            qr_str: `${orderNumber}-${index}`,

            status: tmpReservation.status_after,

            seat_code: tmpReservation.seat_code,
            seat_grade_name: tmpReservation.seat_grade_name,
            seat_grade_additional_charge: tmpReservation.seat_grade_additional_charge,

            ticket_type: tmpReservation.ticket_type,
            ticket_type_name: tmpReservation.ticket_type_name,
            ticket_type_charge: tmpReservation.ticket_type_charge,
            ticket_cancel_charge: tmpReservation.ticket_cancel_charge,
            ticket_ttts_extension: tmpReservation.ticket_ttts_extension,

            charge: tmpReservation.charge,
            payment_no: tmpReservation.payment_no,
            purchaser_group: transaction.object.purchaser_group,

            performance: performance.id,
            performance_day: performance.day,
            performance_open_time: performance.open_time,
            performance_start_time: performance.start_time,
            performance_end_time: performance.end_time,
            performance_ttts_extension: performance.ttts_extension,
            performance_canceled: performance.canceled,

            theater: performance.theater.id,
            theater_name: performance.theater.name,
            theater_address: performance.theater.address,

            screen: performance.screen.id,
            screen_name: performance.screen.name,

            film: performance.film.id,
            film_name: performance.film.name,
            film_is_mx4d: performance.film.is_mx4d,
            film_copyright: performance.film.copyright,

            purchaser_last_name: (customerContact !== undefined) ? customerContact.last_name : '',
            purchaser_first_name: (customerContact !== undefined) ? customerContact.first_name : '',
            purchaser_email: (customerContact !== undefined) ? customerContact.email : '',
            purchaser_international_tel: '',
            purchaser_tel: (customerContact !== undefined) ? customerContact.tel : '',
            purchaser_age: (customerContact !== undefined) ? customerContact.age : '',
            purchaser_address: (customerContact !== undefined) ? customerContact.address : '',
            purchaser_gender: (customerContact !== undefined) ? customerContact.gender : '',

            // 会員の場合は値を入れる
            owner: (transaction.agent.id !== '') ? transaction.agent.id : undefined,
            owner_username: (transaction.agent.id !== '') ? transaction.agent.username : undefined,
            owner_name: (transaction.agent.id !== '') ? transaction.agent.name : undefined,
            owner_email: (transaction.agent.id !== '') ? transaction.agent.email : undefined,
            owner_group: (transaction.agent.id !== '') ? transaction.agent.group : undefined,
            owner_signature: (transaction.agent.id !== '') ? transaction.agent.signature : undefined,

            payment_method: <factory.paymentMethodType>transaction.object.paymentMethod,

            watcher_name: tmpReservation.watcher_name,
            watcher_name_updated_at: now.toDate(),

            reservation_ttts_extension: tmpReservation.reservation_ttts_extension,

            purchased_at: now.toDate(),

            // クレジット決済
            gmo_order_id: gmoOrderId,

            payment_seat_index: index,

            checkins: []
        };
    });

    const paymentMethods = [{
        name: transaction.object.paymentMethod.toString(),
        paymentMethod: transaction.object.paymentMethod.toString(),
        paymentMethodId: (transaction.object.paymentMethod === factory.paymentMethodType.CreditCard) ? gmoOrderId : ''
    }];
    const price = eventReservations
        .filter((r) => r.status === factory.reservationStatusType.ReservationConfirmed)
        .reduce((a, b) => a + b.charge, 0);

    return {
        order: {
            typeOf: 'Order',
            confirmationNumber: eventReservations[0].payment_no,
            orderNumber: orderNumber,
            price: price,
            priceCurrency: factory.priceCurrency.JPY,
            paymentMethods: paymentMethods,
            discounts: [],
            url: '',
            orderStatus: factory.orderStatus.OrderDelivered,
            orderDate: now.toDate(),
            isGift: false,
            orderInquiryKey: {
                performanceDay: performance.day,
                paymentNo: eventReservations[0].payment_no,
                // 連絡先情報がないケースは、とりあえず固定で(電話番号で照会されることは現時点でない)
                // tslint:disable-next-line:no-magic-numbers
                telephone: (customerContact !== undefined) ? customerContact.tel.slice(-4) : '9999' // 電話番号下4桁
            }
        },
        eventReservations
    };
}
