/**
 * 売上集計サービス
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as moment from 'moment-timezone';

import { IReport, MongoRepository as AggregateSaleRepo, Status4csv } from '../../repo/aggregateSale';

export type ICompoundPriceSpecification = factory.chevre.compoundPriceSpecification.IPriceSpecification<any>;

function getUnitPriceByAcceptedOffer(offer: cinerinoapi.factory.order.IAcceptedOffer<any>) {
    let unitPrice: number = 0;

    if (offer.priceSpecification !== undefined) {
        const priceSpecification = <ICompoundPriceSpecification>offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceSpec = priceSpecification.priceComponent.find(
                (c) => c.typeOf === factory.chevre.priceSpecificationType.UnitPriceSpecification
            );
            if (typeof unitPriceSpec?.price === 'number') {
                unitPrice = unitPriceSpec.price;
            }
        }
    } else if (typeof offer.price === 'number') {
        unitPrice = offer.price;
    }

    return unitPrice;
}

/**
 * 注文取引からレポートを作成する
 */
export function createPlaceOrderReport(params: {
    order: cinerinoapi.factory.order.IOrder;
}) {
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        const datas: IReport[] = [];

        datas.push(
            ...params.order.acceptedOffers
                .map((o, index) => {
                    const unitPrice = getUnitPriceByAcceptedOffer(o);

                    return reservation2report(
                        {
                            ...<cinerinoapi.factory.order.IReservation>o.itemOffered,
                            checkins: []
                        },
                        unitPrice,
                        params.order,
                        params.order.orderDate,
                        index
                    );
                })
        );

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await aggregateSaleRepo.saveReport(data);
        }));
    };
}

/**
 * 注文返品取引からレポートを作成する
 */
export function createReturnOrderReport(params: {
    order: cinerinoapi.factory.order.IOrder;
}) {
    return async (repos: {
        aggregateSale: AggregateSaleRepo;
    }): Promise<void> => {
        const datas: IReport[] = [];

        const dateReturned = moment(<Date>params.order.dateReturned)
            .toDate();
        let cancellationFee = 0;
        if (Array.isArray(params.order.returner?.identifier)) {
            const cancellationFeeValue = params.order.returner?.identifier.find((p: any) => p.name === 'cancellationFee')?.value;
            if (cancellationFeeValue !== undefined) {
                cancellationFee = Number(cancellationFeeValue);
            }
        }

        params.order.acceptedOffers.forEach((o, reservationIndex) => {
            const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;
            const unitPrice = getUnitPriceByAcceptedOffer(o);

            // 座席分のキャンセルデータ
            datas.push({
                ...reservation2report(
                    {
                        ...r,
                        checkins: []
                    },
                    unitPrice,
                    params.order,
                    <Date>params.order.dateReturned,
                    reservationIndex
                ),
                reservationStatus: Status4csv.Cancelled,
                status_sort: `${factory.chevre.reservationStatusType.ReservationConfirmed}_1`,
                cancellationFee: cancellationFee,
                orderDate: moment(dateReturned)
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD HH:mm:ss')
            });
        });

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await repos.aggregateSale.saveReport(data);
        }));
    };
}

/**
 * 注文返金レポートを作成する
 */
export function createRefundOrderReport(params: {
    order: cinerinoapi.factory.order.IOrder;
}) {
    return async (repos: {
        aggregateSale: AggregateSaleRepo;
    }): Promise<void> => {
        const datas: IReport[] = [];

        const dateReturned = moment(<Date>params.order.dateReturned)
            .toDate();
        let cancellationFee = 0;
        if (Array.isArray(params.order.returner?.identifier)) {
            const cancellationFeeValue = params.order.returner?.identifier.find((p: any) => p.name === 'cancellationFee')?.value;
            if (cancellationFeeValue !== undefined) {
                cancellationFee = Number(cancellationFeeValue);
            }
        }

        params.order.acceptedOffers.forEach((o, reservationIndex) => {
            const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;
            const unitPrice = getUnitPriceByAcceptedOffer(o);

            // 購入分のキャンセル料データ
            if (reservationIndex === 0) {
                datas.push({
                    ...reservation2report(
                        {
                            ...r,
                            checkins: []
                        },
                        unitPrice,
                        params.order,
                        dateReturned
                        // reservationIndex // 返品手数料行にはpayment_seat_indexなし
                    ),
                    seat: {
                        code: ''
                    },
                    ticketType: {
                        name: '',
                        charge: cancellationFee.toString(),
                        csvCode: ''
                    },
                    // payment_seat_index: '',
                    reservationStatus: Status4csv.CancellationFee,
                    status_sort: `${factory.chevre.reservationStatusType.ReservationConfirmed}_2`,
                    cancellationFee: cancellationFee,
                    price: cancellationFee.toString(),
                    orderDate: moment(dateReturned)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD HH:mm:ss')
                });
            }
        });

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await repos.aggregateSale.saveReport(data);
        }));
    };
}

/**
 * 予約データからレポートを更新する
 * 何かしらの操作で予約データ更新時に連動される(入場時など)
 */
export function updateOrderReportByReservation(params: { reservation: factory.reservation.event.IReservation }) {
    return async (repos: {
        aggregateSale: AggregateSaleRepo;
    }): Promise<void> => {
        // const paymentSeatIndex = params.reservation.additionalProperty?.find((p) => p.name === 'paymentSeatIndex')?.value;
        // if (typeof paymentSeatIndex !== 'string') {
        //     throw new Error('paymentSeatIndex undefined');
        // }

        // const paymentNo = params.reservation.underName?.identifier?.find((p) => p.name === 'paymentNo')?.value;
        // if (typeof paymentNo !== 'string') {
        //     throw new Error('paymentSeatIndex paymentNo');
        // }

        await repos.aggregateSale.updateAttendStatus({
            // performance+payment_no+payment_seat_index の指定については、予約IDで更新に変更、でよいのでは？
            reservation: { id: params.reservation.id },
            // performance: { id: params.reservation.reservationFor.id },
            // payment_no: paymentNo,
            // payment_seat_index: Number(paymentSeatIndex),
            checkedin: params.reservation.checkins.length > 0 ? 'TRUE' : 'FALSE',
            checkinDate: params.reservation.checkins.length > 0
                ? moment(params.reservation.checkins[0].when)
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD HH:mm:ss')
                : ''

        });
    };
}

/**
 * 予約データをcsvデータ型に変換する
 */
// tslint:disable-next-line:cyclomatic-complexity
function reservation2report(
    r: factory.reservation.event.IReservation,
    unitPrice: number,
    order: cinerinoapi.factory.order.IOrder,
    targetDate: Date,
    paymentSeatIndex?: number
): IReport {
    const age = (typeof order.customer.age === 'string') ? order.customer.age : '';

    let username = '';
    if (typeof order.customer.memberOf?.membershipNumber === 'string') {
        username = order.customer.memberOf.membershipNumber;
    }

    let paymentMethodName = '';
    if (Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
        paymentMethodName = order.paymentMethods[0].name;
    }

    const locale = (typeof order.customer.address === 'string') ? order.customer.address : '';
    const gender = (typeof order.customer.gender === 'string') ? order.customer.gender : '';
    const customerSegment = (locale !== '' ? locale : '__') + (age !== '' ? age : '__') + (gender !== '' ? gender : '_');

    let csvCode = r.reservedTicket.ticketType.additionalProperty?.find((p) => p.name === 'csvCode')?.value;
    if (typeof csvCode !== 'string') {
        csvCode = '';
    }

    const customerGroup: string = order2customerGroup(order);

    return {
        reservation: { id: r.id },
        payment_no: order.confirmationNumber,
        ...(typeof paymentSeatIndex === 'number') ? { payment_seat_index: paymentSeatIndex } : undefined,
        performance: {
            id: r.reservationFor.id,
            startDay: moment(r.reservationFor.startDate)
                .tz('Asia/Tokyo')
                .format('YYYYMMDD'),
            startTime: moment(r.reservationFor.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm')
        },
        seat: {
            code: (r.reservedTicket.ticketedSeat !== undefined) ? r.reservedTicket.ticketedSeat.seatNumber : ''
        },
        ticketType: {
            name: (typeof r.reservedTicket.ticketType.name !== 'string'
                && typeof r.reservedTicket.ticketType.name?.ja === 'string') ? r.reservedTicket.ticketType.name.ja : '',
            csvCode,
            charge: unitPrice.toString()
        },
        customer: {
            group: customerGroup2reportString({ group: customerGroup }),
            givenName: (typeof order.customer.givenName === 'string') ? order.customer.givenName : '',
            familyName: (typeof order.customer.familyName === 'string') ? order.customer.familyName : '',
            email: (typeof order.customer.email === 'string') ? order.customer.email : '',
            telephone: (typeof order.customer.telephone === 'string') ? order.customer.telephone : '',
            segment: customerSegment,
            username: username
        },
        orderDate: moment(order.orderDate)
            .tz('Asia/Tokyo')
            .format('YYYY/MM/DD HH:mm:ss'),
        paymentMethod: paymentMethodName2reportString({ name: paymentMethodName }),
        checkedin: r.checkins.length > 0 ? 'TRUE' : 'FALSE',
        checkinDate: r.checkins.length > 0 ? moment(r.checkins[0].when)
            .tz('Asia/Tokyo')
            .format('YYYY/MM/DD HH:mm:ss') : '',
        reservationStatus: Status4csv.Reserved,
        status_sort: factory.chevre.reservationStatusType.ReservationConfirmed,
        price: order.price.toString(),
        cancellationFee: 0,
        date_bucket: targetDate
    };
}

function order2customerGroup(params: cinerinoapi.factory.order.IOrder) {
    let customerGroup: string = 'Customer';
    if (Array.isArray(params.customer.identifier)) {
        const customerGroupValue = params.customer.identifier.find((i) => i.name === 'customerGroup')?.value;
        if (typeof customerGroupValue === 'string') {
            customerGroup = customerGroupValue;
        }
    }

    return customerGroup;
}

function paymentMethodName2reportString(params: { name: string }) {
    if (params.name === 'CreditCard') {
        return '0';
    }

    return params.name;
}

function customerGroup2reportString(params: { group: string }) {
    if (params.group === 'Customer') {
        return '01';
    } else if (params.group === 'Staff') {
        return '04';
    }

    return params.group;
}
