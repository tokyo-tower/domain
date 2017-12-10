/**
 * placeOrder in progress transaction service
 * 進行中注文取引サービス
 * @namespace service.transaction.placeOrderInProgress
 */

import * as GMO from '@motionpicture/gmo-service';
import * as waiter from '@motionpicture/waiter-domain';
import * as createDebug from 'debug';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import * as mongoose from 'mongoose';

import * as factory from '../../factory';
import { MongoRepository as CreditCardAuthorizeActionRepo } from '../../repo/action/authorize/creditCard';
import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../../repo/action/authorize/seatReservation';
import { MongoRepository as OwnerRepo } from '../../repo/owner';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as CreditCardAuthorizeActionService from './placeOrderInProgress/action/authorize/creditCard';
import * as SeatReservationAuthorizeActionService from './placeOrderInProgress/action/authorize/seatReservation';

import * as ReservationUtil from '../../util/reservation';

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
 * メール追加
 *
 * @param {string} transactionId
 * @param {EmailNotification} notification
 * @returns {TransactionOperation<void>}
 *
 * @memberof service.transaction.placeOrderInProgress
 */
// export function addEmail(transactionId: string, notification: EmailNotificationFactory.INotification) {
//     return async (transactionRepo: TransactionRepo) => {
//         // イベント作成
//         const event = AddNotificationTransactionEventFactory.create({
//             occurredAt: new Date(),
//             notification: notification
//         });

//         // 永続化
//         debug('adding an event...', event);
//         await pushEvent(transactionId, event)(transactionRepo);
//     };
// }

/**
 * メール削除
 *
 * @param {string} transactionId
 * @param {string} notificationId
 * @returns {TransactionOperation<void>}
 *
 * @memberof service.transaction.placeOrderInProgress
 */
// export function removeEmail(transactionId: string, notificationId: string) {
//     return async (transactionRepo: TransactionRepo) => {
//         const transaction = await findInProgressById(transactionId)(transactionRepo)
//             .then((option) => {
//                 if (option.isEmpty) {
//                     throw new factory.errors.Argument('transactionId', `transaction[${transactionId}] not found.`);
//                 }

//                 return option.get();
//             });

//         type ITransactionEvent = AddNotificationTransactionEventFactory.ITransactionEvent<EmailNotificationFactory.INotification>;
//         const addNotificationTransactionEvent = <ITransactionEvent>transaction.object.actionEvents.find(
//             (actionEvent) =>
//                 actionEvent.actionEventType === TransactionEventGroup.AddNotification &&
//                 (<ITransactionEvent>actionEvent).notification.id === notificationId
//         );
//         if (addNotificationTransactionEvent === undefined) {
//             throw new factory.errors.Argument('notificationId', `notification [${notificationId}] not found in the transaction.`);
//         }

//         // イベント作成
//         const event = RemoveNotificationTransactionEventFactory.create({
//             occurredAt: new Date(),
//             notification: addNotificationTransactionEvent.notification
//         });

//         // 永続化
//         await pushEvent(transactionId, event)(transactionRepo);
//     };
// }

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
export async function confirm(
    agentId: string,
    transactionId: string
): Promise<factory.transaction.placeOrder.ITransaction> {
    const transactionRepo = new TransactionRepo(mongoose.connection);
    const creditCardAuthorizeActionRepo = new CreditCardAuthorizeActionRepo(mongoose.connection);
    const seatReservationAuthorizeActionRepo = new SeatReservationAuthorizeActionRepo(mongoose.connection);

    const now = new Date();
    const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);
    if (transaction.agent.id !== agentId) {
        throw new factory.errors.Forbidden('A specified transaction is not yours.');
    }

    // 取引に対する全ての承認アクションをマージ
    let authorizeActions = [
        ... await creditCardAuthorizeActionRepo.findByTransactionId(transactionId),
        ... await seatReservationAuthorizeActionRepo.findByTransactionId(transactionId)
    ];

    // 万が一このプロセス中に他処理が発生してもそれらを無視するように、endDateでフィルタリング
    authorizeActions = authorizeActions.filter(
        (authorizeAction) => (authorizeAction.endDate !== undefined && authorizeAction.endDate < now)
    );
    transaction.object.authorizeActions = authorizeActions;

    // 照会可能になっているかどうか
    if (!canBeClosed(transaction)) {
        throw new factory.errors.Argument('transactionId', 'Transaction cannot be confirmed because prices are not matched.');
    }

    // 結果作成
    // const order = factory.order.createFromPlaceOrderTransaction({
    //     transaction: transaction,
    //     orderDate: now,
    //     orderStatus: factory.orderStatus.OrderDelivered,
    //     isGift: false
    // });
    // const ownershipInfos = order.acceptedOffers.map((acceptedOffer) => {
    //     // ownershipInfoのidentifierはコレクション内でuniqueである必要があるので、この仕様には要注意
    //     // saveする際に、identifierでfindOneAndUpdateしている
    //     const identifier = `${acceptedOffer.itemOffered.typeOf}-${acceptedOffer.itemOffered.reservedTicket.ticketToken}`;

    //     return factory.ownershipInfo.create({
    //         identifier: identifier,
    //         ownedBy: {
    //             id: transaction.agent.id,
    //             typeOf: transaction.agent.typeOf,
    //             name: order.customer.name
    //         },
    //         acquiredFrom: transaction.seller,
    //         ownedFrom: now,
    //         // イベント予約に対する所有権の有効期限はイベント終了日時までで十分だろう
    //         // 現時点では所有権対象がイベント予約のみなので、これで問題ないが、
    //         // 対象が他に広がれば、有効期間のコントロールは別でしっかり行う必要があるだろう
    //         ownedThrough: acceptedOffer.itemOffered.reservationFor.endDate,
    //         typeOfGood: acceptedOffer.itemOffered
    //     });
    // });
    transaction.result = {
        eventReservations: createReservations(transaction)
    };

    // ステータス変更
    debug('updating transaction...');
    await transactionRepo.confirmPlaceOrder(
        transactionId,
        now,
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
export function createReservations(transaction: factory.transaction.placeOrder.ITransaction): factory.reservation.event.IReservation[] {
    const seatReservationAuthorizeAction = <factory.action.authorize.seatReservation.IAction>transaction.object.authorizeActions
        .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .find((authorizeAction) => authorizeAction.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.SeatReservation);
    const creditCardAuthorizeAction = <factory.action.authorize.creditCard.IAction>transaction.object.authorizeActions
        .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .find((authorizeAction) => authorizeAction.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.CreditCard);

    const tmpReservations = (<factory.action.authorize.seatReservation.IResult>seatReservationAuthorizeAction.result).tmpReservations;
    const performance = (<factory.action.authorize.seatReservation.IObject>seatReservationAuthorizeAction.object).performance;
    const customerContact = <factory.transaction.placeOrder.ICustomerContact>transaction.object.customerContact;
    const now = new Date();

    // 2017/07/08 特殊チケット対応
    // const seatCodesAll: string[] = Array.prototype.concat(reservationModel.seatCodes, reservationModel.seatCodesExtra);

    // tslint:disable-next-line:max-func-body-length
    return tmpReservations.map((tmpReservation, index) => {
        let status = ReservationUtil.STATUS_RESERVED;
        // 特殊チケット一時予約を特殊チケット予約完了ステータスへ変更
        if (tmpReservation.status === ReservationUtil.STATUS_TEMPORARY_FOR_SECURE_EXTRA) {
            status = ReservationUtil.STATUS_ON_KEPT_FOR_SECURE_EXTRA;
        }

        return {
            typeOf: factory.reservation.reservationType.EventReservation,
            reservationStatus: factory.reservationStatusType.ReservationConfirmed,
            qr_str: `${performance.day}-${tmpReservation.payment_no}-${index}`,

            status: status,

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
            purchaser_group: tmpReservation.purchaser_group,

            performance: performance._id,
            performance_day: performance.day,
            performance_open_time: performance.open_time,
            performance_start_time: performance.start_time,
            performance_end_time: performance.end_time,
            performance_ttts_extension: performance.ttts_extension,
            performance_canceled: performance.caceled,

            theater: performance.theater._id,
            theater_name: performance.theater.name,
            theater_address: performance.theater.address,

            screen: performance.screen._id,
            screen_name: performance.screen.name,

            film: performance.film._id,
            film_name: performance.film.name,
            film_image: performance.film.image,
            film_is_mx4d: performance.film.is_mx4d,
            film_copyright: performance.film.copyright,

            purchaser_last_name: customerContact.last_name,
            purchaser_first_name: customerContact.first_name,
            purchaser_email: customerContact.email,
            purchaser_international_tel: '',
            purchaser_tel: customerContact.tel,
            purchaser_age: customerContact.age,
            purchaser_address: customerContact.address,
            purchaser_gender: customerContact.gender,

            // 会員の場合は値を入れる
            owner: (transaction.agent.id !== '') ? '' : undefined,
            owner_username: (transaction.agent.id !== '') ? transaction.agent.username : undefined,
            owner_name: (transaction.agent.id !== '') ? transaction.agent.name : undefined,
            owner_email: (transaction.agent.id !== '') ? transaction.agent.email : undefined,
            owner_group: (transaction.agent.id !== '') ? transaction.agent.group : undefined,
            owner_signature: (transaction.agent.id !== '') ? transaction.agent.signature : undefined,

            payment_method: GMO.utils.util.PayType.Credit, // TOOD 実装

            watcher_name: tmpReservation.watcher_name,
            watcher_name_updated_at: now,

            reservation_ttts_extension: tmpReservation.reservation_ttts_extension,

            purchased_at: now,

            // クレジット決済
            gmo_shop_id: <string>process.env.GMO_SHOP_ID,
            gmo_shop_pass: <string>process.env.GMO_SHOP_PASS,
            gmo_order_id: creditCardAuthorizeAction.object.orderId,
            gmo_amount: creditCardAuthorizeAction.object.amount.toString(),
            gmo_access_id: (<factory.action.authorize.creditCard.IResult>creditCardAuthorizeAction.result).execTranArgs.accessId,
            gmo_access_pass: (<factory.action.authorize.creditCard.IResult>creditCardAuthorizeAction.result).execTranArgs.accessPass,
            gmo_status: GMO.utils.util.Status.Auth,
            gmo_shop_pass_string: '',
            gmo_tax: '',
            gmo_forward: '',
            gmo_method: '',
            gmo_approve: '',
            gmo_tran_id: '',
            gmo_tran_date: '',
            gmo_pay_type: '',
            gmo_cvs_code: '',
            gmo_cvs_conf_no: '',
            gmo_cvs_receipt_no: '',
            gmo_cvs_receipt_url: '',
            gmo_payment_term: '',

            payment_seat_index: index,

            checkins: []
        };
    });
}
