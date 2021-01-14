/**
 * 売上レポートサービス
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as moment from 'moment-timezone';
import * as util from 'util';

import { MongoRepository as ReportRepo } from '../../repo/report';

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

function getSortBy(order: cinerinoapi.factory.order.IOrder, reservation: cinerinoapi.factory.order.IReservation, status: string) {
    const seatNumber = reservation.reservedTicket.ticketedSeat?.seatNumber;

    return util.format(
        '%s:%s:%s:%s',
        `00000000000000000000${moment(reservation.reservationFor.startDate)
            .unix()}`
            // tslint:disable-next-line:no-magic-numbers
            .slice(-20),
        `00000000000000000000${order.confirmationNumber}`
            // tslint:disable-next-line:no-magic-numbers
            .slice(-20),
        status,
        (typeof seatNumber === 'string') ? seatNumber : reservation.id
    );
}

/**
 * 注文からレポートを作成する
 */
export function createPlaceOrderReport(params: {
    order: cinerinoapi.factory.order.IOrder;
}) {
    return async (repos: { report: ReportRepo }): Promise<void> => {
        const datas: factory.report.order.IReport[] = [];

        datas.push(
            ...params.order.acceptedOffers
                .map((o, index) => {
                    const unitPrice = getUnitPriceByAcceptedOffer(o);
                    const sortBy = getSortBy(params.order, <cinerinoapi.factory.order.IReservation>o.itemOffered, '00');

                    return reservation2report(
                        <cinerinoapi.factory.order.IReservation>o.itemOffered,
                        unitPrice,
                        params.order,
                        params.order.orderDate,
                        index,
                        sortBy
                    );
                })
        );

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await repos.report.saveReport(data);
        }));
    };
}

/**
 * 返品された注文からレポートを作成する
 */
export function createReturnOrderReport(params: {
    order: cinerinoapi.factory.order.IOrder;
}) {
    return async (repos: { report: ReportRepo }): Promise<void> => {
        const datas: factory.report.order.IReport[] = [];

        const dateReturned = moment(<Date>params.order.dateReturned)
            .toDate();

        params.order.acceptedOffers.forEach((o, reservationIndex) => {
            const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;
            const unitPrice = getUnitPriceByAcceptedOffer(o);
            const sortBy = getSortBy(params.order, r, '01');

            // 座席分のキャンセルデータ
            datas.push({
                ...reservation2report(
                    r,
                    unitPrice,
                    params.order,
                    <Date>params.order.dateReturned,
                    reservationIndex,
                    sortBy
                ),
                ...{
                    reservationStatus: factory.report.order.ReportCategory.Cancelled,
                    status_sort: `${factory.chevre.reservationStatusType.ReservationConfirmed}_1`
                },
                orderDate: moment(dateReturned)
                    .toDate(),
                category: factory.report.order.ReportCategory.Cancelled
            });
        });

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await repos.report.saveReport(data);
        }));
    };
}

/**
 * 返金された注文からレポートを作成する
 */
export function createRefundOrderReport(params: {
    order: cinerinoapi.factory.order.IOrder;
}) {
    return async (repos: { report: ReportRepo }): Promise<void> => {
        const datas: factory.report.order.IReport[] = [];

        const dateReturned = moment(<Date>params.order.dateReturned)
            .toDate();
        let cancellationFee = 0;
        const returnerIdentifier = params.order.returner?.identifier;
        if (Array.isArray(returnerIdentifier)) {
            const cancellationFeeValue = returnerIdentifier.find((p) => p.name === 'cancellationFee')?.value;
            if (cancellationFeeValue !== undefined) {
                cancellationFee = Number(cancellationFeeValue);
            }
        }

        params.order.acceptedOffers.forEach((o, reservationIndex) => {
            const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;
            const unitPrice = getUnitPriceByAcceptedOffer(o);
            const sortBy = getSortBy(params.order, r, '02');

            // 購入分のキャンセル料データ
            if (reservationIndex === 0) {
                datas.push({
                    ...reservation2report(
                        r,
                        unitPrice,
                        params.order,
                        dateReturned,
                        // 返品手数料行にはpayment_seat_indexなし
                        undefined,
                        sortBy
                    ),
                    ...{
                        seat: {
                            code: ''
                        },
                        ticketType: {
                            name: '',
                            charge: cancellationFee.toString(),
                            csvCode: ''
                        },
                        reservationStatus: factory.report.order.ReportCategory.CancellationFee,
                        status_sort: `${factory.chevre.reservationStatusType.ReservationConfirmed}_2`
                    },
                    price: cancellationFee.toString(),
                    orderDate: moment(dateReturned)
                        .toDate(),
                    category: factory.report.order.ReportCategory.CancellationFee
                });
            }
        });

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await repos.report.saveReport(data);
        }));
    };
}

/**
 * 予約データをcsvデータ型に変換する
 */
// tslint:disable-next-line:cyclomatic-complexity
function reservation2report(
    r: factory.chevre.reservation.IReservation<factory.chevre.reservationType.EventReservation>,
    unitPrice: number,
    order: cinerinoapi.factory.order.IOrder,
    targetDate: Date,
    paymentSeatIndex?: number,
    sortBy?: string
): factory.report.order.IReport {
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
    const seatNumber = r.reservedTicket.ticketedSeat?.seatNumber;

    return {
        project: { typeOf: order.project.typeOf, id: order.project.id },
        reservation: {
            id: r.id,
            reservationFor: {
                id: r.reservationFor.id,
                startDate: moment(r.reservationFor.startDate)
                    .toDate()
            },
            reservedTicket: {
                ticketType: {
                    csvCode,
                    name: <any>r.reservedTicket.ticketType.name,
                    ...(typeof unitPrice === 'number')
                        ? { priceSpecification: { price: unitPrice } }
                        : undefined
                },
                ticketedSeat: (typeof seatNumber === 'string') ? { seatNumber } : undefined
            }
        },
        confirmationNumber: order.confirmationNumber,
        ...(typeof paymentSeatIndex === 'number') ? { payment_seat_index: paymentSeatIndex } : undefined,
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
            .toDate(),
        paymentMethod: paymentMethodName2reportString({ name: paymentMethodName }),
        checkedin: 'FALSE', // デフォルトはFALSE
        checkinDate: '', // デフォルトは空文字
        price: order.price.toString(),
        category: factory.report.order.ReportCategory.Reserved,
        ...(typeof sortBy === 'string' && sortBy.length > 0) ? { sortBy } : undefined,
        ...{
            date_bucket: targetDate,
            payment_no: order.confirmationNumber,
            performance: {
                id: r.reservationFor.id,
                startDay: moment(r.reservationFor.startDate)
                    .tz('Asia/Tokyo')
                    .format('YYYYMMDD'),
                startTime: moment(r.reservationFor.startDate)
                    .tz('Asia/Tokyo')
                    .format('HHmm')
            },
            reservationStatus: factory.report.order.ReportCategory.Reserved,
            seat: {
                code: (r.reservedTicket.ticketedSeat !== undefined) ? r.reservedTicket.ticketedSeat.seatNumber : ''
            },
            status_sort: factory.chevre.reservationStatusType.ReservationConfirmed,
            ticketType: {
                name: (typeof r.reservedTicket.ticketType.name !== 'string'
                    && typeof r.reservedTicket.ticketType.name?.ja === 'string') ? r.reservedTicket.ticketType.name.ja : '',
                csvCode,
                charge: unitPrice.toString()
            }
        }
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
