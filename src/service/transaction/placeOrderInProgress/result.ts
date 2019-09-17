import * as factory from '@tokyotower/factory';
import * as moment from 'moment-timezone';

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

/**
 * 注文取引結果を作成する
 */
// tslint:disable-next-line:max-func-body-length
export function createOrder(
    confirmationNumber: string,
    orderNumber: string,
    transaction: factory.transaction.placeOrder.ITransaction
): factory.transaction.placeOrder.IResult {
    // tslint:disable-next-line:no-magic-numbers
    const paymentNo = confirmationNumber.slice(-6);

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
    const chevreReservations = (Array.isArray(reserveTransaction.object.reservations)) ? reserveTransaction.object.reservations : [];

    const profile = transaction.agent;

    const orderDate = new Date();

    // 注文番号を作成
    let paymentMethodId = '';
    if (creditCardAuthorizeAction !== undefined && creditCardAuthorizeAction.result !== undefined) {
        paymentMethodId = creditCardAuthorizeAction.result.paymentMethodId;
    }

    const paymentMethods: factory.order.IPaymentMethod<factory.cinerino.paymentMethodType>[] = [];

    // 決済方法をセット
    Object.keys(factory.cinerino.paymentMethodType)
        .forEach((key) => {
            const paymentMethodType = <factory.cinerino.paymentMethodType>(<any>factory.cinerino.paymentMethodType)[key];
            transaction.object.authorizeActions
                .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                .filter((a) => a.result !== undefined && a.result.paymentMethod === paymentMethodType)
                .forEach((a: any) => {
                    const authorizePaymentMethodAction =
                        <factory.cinerino.action.authorize.paymentMethod.any.IAction<factory.cinerino.paymentMethodType>>a;
                    const result = (<factory.cinerino.action.authorize.paymentMethod.any.IResult<factory.cinerino.paymentMethodType>>
                        authorizePaymentMethodAction.result);
                    paymentMethods.push({
                        accountId: result.accountId,
                        additionalProperty: (Array.isArray(result.additionalProperty)) ? result.additionalProperty : [],
                        name: result.name,
                        paymentMethodId: result.paymentMethodId,
                        totalPaymentDue: result.totalPaymentDue,
                        typeOf: paymentMethodType
                    });
                });
        });

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
            customer: profile,
            bookingTime: orderDate,
            paymentMethodName: paymentMethods[0].name
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

    const customerIdentifier = (Array.isArray(transaction.agent.identifier)) ? transaction.agent.identifier : [];
    const customer: factory.order.ICustomer = {
        ...profile,
        id: transaction.agent.id,
        typeOf: transaction.agent.typeOf,
        name: `${profile.givenName} ${profile.familyName}`,
        url: '',
        identifier: customerIdentifier
    };

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
    customer: factory.transaction.placeOrder.IAgent;
    bookingTime: Date;
    paymentMethodName: string;
}): factory.chevre.reservation.IReservation<factory.chevre.reservationType.EventReservation> {
    const transaction = params.transaction;
    const customer = params.customer;

    const underName: factory.chevre.reservation.IUnderName<factory.chevre.reservationType.EventReservation> = {
        typeOf: factory.personType.Person,
        id: params.transaction.agent.id,
        name: `${customer.givenName} ${customer.familyName}`,
        familyName: customer.familyName,
        givenName: customer.givenName,
        email: customer.email,
        telephone: customer.telephone,
        gender: customer.gender,
        identifier: [
            { name: 'orderNumber', value: params.orderNumber },
            { name: 'paymentNo', value: params.paymentNo },
            { name: 'transaction', value: transaction.id },
            { name: 'gmoOrderId', value: params.gmoOrderId },
            ...(typeof customer.age === 'string')
                ? [{ name: 'age', value: customer.age }]
                : [],
            ...(transaction.agent.identifier !== undefined) ? transaction.agent.identifier : [],
            ...(transaction.agent.memberOf !== undefined && transaction.agent.memberOf.membershipNumber !== undefined)
                ? [{ name: 'username', value: transaction.agent.memberOf.membershipNumber }]
                : [],
            ...(params.paymentMethodName !== undefined)
                ? [{ name: 'paymentMethod', value: params.paymentMethodName }]
                : []
        ],
        ...{ address: customer.address }
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
