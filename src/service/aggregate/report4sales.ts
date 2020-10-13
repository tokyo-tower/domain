/**
 * 売上集計サービス
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as factory from '@tokyotower/factory';
import * as moment from 'moment';

import { MongoRepository as AggregateSaleRepo } from '../../repo/aggregateSale';

export type ICompoundPriceSpecification = factory.chevre.compoundPriceSpecification.IPriceSpecification<any>;

/**
 * 購入者区分
 */
export enum PurchaserGroup {
    /**
     * 一般
     */
    Customer = 'Customer'
}

const purchaserGroupStrings: any = {
    Customer: '01',
    Staff: '04'
};
const paymentMethodStrings: any = {
    CreditCard: '0'
};

/**
 * CSVデータインターフェース
 */
interface IData {
    // 購入番号
    payment_no: string;
    payment_seat_index: string;
    performance: {
        // パフォーマンスID
        id: string;
        // 入塔予約年月日
        startDay: string;
        // 入塔予約時刻
        startTime: string;
    };
    customer: {
        // 購入者（名）
        givenName: string;
        // 購入者（姓）
        familyName: string;
        // 購入者メール
        email: string;
        // 購入者電話
        telephone: string;
        // 購入者区分
        group: string;
        // ユーザーネーム
        username: string;
        // 客層
        segment: string;
    };
    // 購入日時
    orderDate: string;
    // 決済方法
    paymentMethod: string;
    seat: {
        // 座席コード
        code: string;
    };
    ticketType: {
        // 券種名称
        name: string;
        // チケットコード
        csvCode: string;
        // 券種料金
        charge: string;
    };
    // 入場フラグ
    checkedin: 'TRUE' | 'FALSE';
    // 入場日時
    checkinDate: string;
    status_sort: string;
    cancellationFee: number;
    // 予約単位料金
    price: string;
    // 予約ステータス
    reservationStatus: Status4csv;
    date_bucket: Date;
    aggregateUnit: AggregateUnit;
}
// CSV用のステータスコード
enum Status4csv {
    Reserved = 'RESERVED',
    Cancelled = 'CANCELLED',
    // キャンセル行ステータス
    CancellationFee = 'CANCELLATION_FEE'
}

// 集計単位
enum AggregateUnit {
    SalesByEndDate = 'SalesByEndDate'
    // SalesByEventStartDate = 'SalesByEventStartDate'
}

function getUnitPriceByAcceptedOffer(offer: cinerinoapi.factory.order.IAcceptedOffer<any>) {
    let unitPrice: number = 0;

    if (offer.priceSpecification !== undefined) {
        const priceSpecification = <ICompoundPriceSpecification>offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceSpec = priceSpecification.priceComponent.find(
                (c) => c.typeOf === factory.chevre.priceSpecificationType.UnitPriceSpecification
            );
            if (unitPriceSpec !== undefined && unitPriceSpec.price !== undefined && Number.isInteger(unitPriceSpec.price)) {
                unitPrice = unitPriceSpec.price;
            }
        }
    } else if (offer.price !== undefined && Number.isInteger(offer.price)) {
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
        const datas: IData[] = [];
        const order = params.order;

        let purchaserGroup: string = PurchaserGroup.Customer;
        if (Array.isArray(order.customer.identifier)) {
            const customerGroupProperty = order.customer.identifier.find((i) => i.name === 'customerGroup');
            if (customerGroupProperty !== undefined && typeof customerGroupProperty.value === 'string') {
                purchaserGroup = customerGroupProperty.value;
            }
        }

        datas.push(
            ...order.acceptedOffers
                .map((o, index) => {
                    const unitPrice = getUnitPriceByAcceptedOffer(o);

                    return reservation2data(
                        {
                            ...<cinerinoapi.factory.order.IReservation>o.itemOffered,
                            checkins: []
                        },
                        unitPrice,
                        order,
                        order.orderDate,
                        AggregateUnit.SalesByEndDate,
                        purchaserGroup,
                        index
                    );
                })
        );

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await saveReport(data)(aggregateSaleRepo);
        }));
    };
}

/**
 * 注文返品取引からレポートを作成する
 */
export function createReturnOrderReport(params: {
    order: cinerinoapi.factory.order.IOrder;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        const datas: IData[] = [];
        const order = params.order;

        let purchaserGroup: string = PurchaserGroup.Customer;
        if (Array.isArray(order.customer.identifier)) {
            const customerGroupProperty = order.customer.identifier.find((i) => i.name === 'customerGroup');
            if (customerGroupProperty !== undefined && typeof customerGroupProperty.value === 'string') {
                purchaserGroup = customerGroupProperty.value;
            }
        }

        const dateReturned = moment(<Date>order.dateReturned).toDate();
        let cancellationFee = 0;
        if (order.returner !== undefined && order.returner !== null) {
            const returner = order.returner;
            if (Array.isArray(returner.identifier)) {
                const cancellationFeeProperty = returner.identifier.find((p: any) => p.name === 'cancellationFee');
                if (cancellationFeeProperty !== undefined) {
                    cancellationFee = Number(cancellationFeeProperty.value);
                }
            }
        }

        order.acceptedOffers.forEach((o, reservationIndex) => {
            const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;
            const unitPrice = getUnitPriceByAcceptedOffer(o);

            // 座席分のキャンセルデータ
            datas.push({
                ...reservation2data(
                    {
                        ...r,
                        checkins: []
                    },
                    unitPrice,
                    order,
                    <Date>order.dateReturned,
                    AggregateUnit.SalesByEndDate,
                    purchaserGroup,
                    reservationIndex
                ),
                reservationStatus: Status4csv.Cancelled,
                status_sort: `${factory.chevre.reservationStatusType.ReservationConfirmed}_1`,
                cancellationFee: cancellationFee,
                orderDate: moment(dateReturned).format('YYYY/MM/DD HH:mm:ss')
            });
        });

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await saveReport(data)(aggregateSaleRepo);
        }));
    };
}

/**
 * 注文返金レポートを作成する
 */
export function createRefundOrderReport(params: {
    order: cinerinoapi.factory.order.IOrder;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        const datas: IData[] = [];
        const order = params.order;

        let purchaserGroup: string = PurchaserGroup.Customer;
        if (Array.isArray(order.customer.identifier)) {
            const customerGroupProperty = order.customer.identifier.find((i) => i.name === 'customerGroup');
            if (customerGroupProperty !== undefined && typeof customerGroupProperty.value === 'string') {
                purchaserGroup = customerGroupProperty.value;
            }
        }

        const dateReturned = moment(<Date>order.dateReturned).toDate();
        let cancellationFee = 0;
        if (order.returner !== undefined && order.returner !== null) {
            const returner = order.returner;
            if (Array.isArray(returner.identifier)) {
                const cancellationFeeProperty = returner.identifier.find((p: any) => p.name === 'cancellationFee');
                if (cancellationFeeProperty !== undefined) {
                    cancellationFee = Number(cancellationFeeProperty.value);
                }
            }
        }

        order.acceptedOffers.forEach((o, reservationIndex) => {
            const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;
            const unitPrice = getUnitPriceByAcceptedOffer(o);

            // 購入分のキャンセル料データ
            if (reservationIndex === 0) {
                datas.push({
                    ...reservation2data(
                        {
                            ...r,
                            checkins: []
                        },
                        unitPrice,
                        order,
                        dateReturned,
                        AggregateUnit.SalesByEndDate,
                        purchaserGroup,
                        reservationIndex
                    ),
                    seat: {
                        code: ''
                    },
                    ticketType: {
                        name: '',
                        charge: cancellationFee.toString(),
                        csvCode: ''
                    },
                    payment_seat_index: '',
                    reservationStatus: Status4csv.CancellationFee,
                    status_sort: `${factory.chevre.reservationStatusType.ReservationConfirmed}_2`,
                    cancellationFee: cancellationFee,
                    price: cancellationFee.toString(),
                    orderDate: moment(dateReturned).format('YYYY/MM/DD HH:mm:ss')
                });
            }
        });

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await saveReport(data)(aggregateSaleRepo);
        }));
    };
}

/**
 * レポートを保管する
 */
function saveReport(data: IData) {
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        await aggregateSaleRepo.aggregateSaleModel.findOneAndUpdate(
            {
                'performance.id': data.performance.id,
                payment_no: data.payment_no,
                payment_seat_index: data.payment_seat_index,
                reservationStatus: data.reservationStatus,
                aggregateUnit: data.aggregateUnit
            },
            data,
            { new: true, upsert: true }
        ).exec();
    };
}

/**
 * 予約データからレポートを更新する
 * 何かしらの操作で予約データ更新時に連動される(入場時など)
 */
export function updateOrderReportByReservation(params: { reservation: factory.reservation.event.IReservation }) {
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        let paymentSeatIndex = (<any>params.reservation).payment_seat_index; // 互換性維持のため
        if (Array.isArray(params.reservation.additionalProperty)) {
            const paymentSeatIndexProperty = params.reservation.additionalProperty.find((p) => p.name === 'paymentSeatIndex');
            if (paymentSeatIndexProperty !== undefined) {
                paymentSeatIndex = paymentSeatIndexProperty.value;
            }
        }

        let paymentNo = params.reservation.reservationNumber; // 互換性維持のため
        if (params.reservation.underName !== undefined && Array.isArray(params.reservation.underName.identifier)) {
            const paymentNoProperty = params.reservation.underName.identifier.find((p) => p.name === 'paymentNo');
            if (paymentNoProperty !== undefined) {
                paymentNo = paymentNoProperty.value;
            }
        }

        await aggregateSaleRepo.aggregateSaleModel.update(
            {
                'performance.id': params.reservation.reservationFor.id,
                payment_no: paymentNo,
                payment_seat_index: paymentSeatIndex
            },
            {
                checkedin: params.reservation.checkins.length > 0 ? 'TRUE' : 'FALSE',
                checkinDate: params.reservation.checkins.length > 0
                    ? moment(params.reservation.checkins[0].when).format('YYYY/MM/DD HH:mm:ss')
                    : ''
            },
            { multi: true }
        ).exec();
    };
}

/**
 * 予約データをcsvデータ型に変換する
 */
// tslint:disable-next-line:cyclomatic-complexity
function reservation2data(
    r: factory.reservation.event.IReservation,
    unitPrice: number,
    order: cinerinoapi.factory.order.IOrder,
    targetDate: Date,
    aggregateUnit: AggregateUnit,
    purchaserGroup: string,
    paymentSeatIndex: number
): IData {
    const age = (typeof order.customer.age === 'string') ? order.customer.age : '';

    let username = '';
    if (order.customer.memberOf !== undefined && typeof order.customer.memberOf.membershipNumber === 'string') {
        username = order.customer.memberOf.membershipNumber;
    }

    let paymentMethod = '';
    if (Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
        paymentMethod = order.paymentMethods[0].name;
    }

    // 客層取得 (購入者居住国：2桁、年代：2桁、性別：1桁)
    const locale = (typeof order.customer.address === 'string') ? order.customer.address : '';
    const gender = (typeof order.customer.gender === 'string') ? order.customer.gender : '';
    const customerSegment = (locale !== '' ? locale : '__') + (age !== '' ? age : '__') + (gender !== '' ? gender : '_');

    let csvCode = ((<any>r).ticket_ttts_extension !== undefined)
        ? (<any>r).ticket_ttts_extension.csv_code
        : ''; // 互換性維持のため
    if (Array.isArray(r.reservedTicket.ticketType.additionalProperty)) {
        const csvCodeProperty = r.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'csvCode');
        if (csvCodeProperty !== undefined) {
            csvCode = csvCodeProperty.value;
        }
    }

    const paymentNo = order.confirmationNumber;

    return {
        payment_no: paymentNo,
        payment_seat_index: String(paymentSeatIndex),
        performance: {
            id: r.reservationFor.id,
            startDay: moment(r.reservationFor.startDate).tz('Asia/Tokyo').format('YYYYMMDD'),
            startTime: moment(r.reservationFor.startDate).tz('Asia/Tokyo').format('HHmm')
        },
        seat: {
            code: (r.reservedTicket.ticketedSeat !== undefined) ? r.reservedTicket.ticketedSeat.seatNumber : ''
        },
        ticketType: {
            name: (typeof r.reservedTicket.ticketType.name !== 'string'
                && typeof r.reservedTicket.ticketType.name?.ja === 'string') ? r.reservedTicket.ticketType.name.ja : '',
            // リリース当初の間違ったマスターデータをカバーするため
            csvCode: (csvCode === '0000000000231') ? '10031' : csvCode,
            charge: unitPrice.toString()
        },
        customer: {
            group: (purchaserGroupStrings[purchaserGroup] !== undefined)
                ? purchaserGroupStrings[purchaserGroup]
                : purchaserGroup,
            givenName: (typeof order.customer.givenName === 'string') ? order.customer.givenName : '',
            familyName: (typeof order.customer.familyName === 'string') ? order.customer.familyName : '',
            email: (typeof order.customer.email === 'string') ? order.customer.email : '',
            telephone: (typeof order.customer.telephone === 'string') ? order.customer.telephone : '',
            segment: customerSegment,
            username: username
        },
        orderDate: moment(order.orderDate).format('YYYY/MM/DD HH:mm:ss'),
        paymentMethod: (paymentMethodStrings[paymentMethod] !== undefined)
            ? paymentMethodStrings[paymentMethod]
            : paymentMethod,
        checkedin: r.checkins.length > 0 ? 'TRUE' : 'FALSE',
        checkinDate: r.checkins.length > 0 ? moment(r.checkins[0].when).format('YYYY/MM/DD HH:mm:ss') : '',
        reservationStatus: Status4csv.Reserved,
        status_sort: factory.chevre.reservationStatusType.ReservationConfirmed,
        price: order.price.toString(),
        cancellationFee: 0,
        date_bucket: targetDate,
        aggregateUnit: aggregateUnit
    };
}
