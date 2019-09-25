/**
 * 売上集計サービス
 */
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { MongoRepository as AggregateSaleRepo } from '../../repo/aggregateSale';

const debug = createDebug('ttts-domain:service');
const STAFF_CLIENT_ID = process.env.STAFF_CLIENT_ID;
const CANCELLATION_FEE = 1000;

/**
 * 購入者区分
 */
export enum PurchaserGroup {
    /**
     * 一般
     */
    Customer = 'Customer',
    /**
     * 内部関係者
     */
    Staff = 'Staff'
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
    theater: {
        // 劇場名称
        name: string;
    };
    screen: {
        // スクリーンID
        id: string;
        // スクリーン名
        name: string;
    };
    film: {
        // 作品ID
        id: string;
        // 作品名称
        name: string;
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
        // 座席グレード名称
        gradeName: string;
        // 座席グレード追加料金
        gradeAdditionalCharge: string;
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
    SalesByEndDate = 'SalesByEndDate',
    SalesByEventStartDate = 'SalesByEventStartDate'
}

/**
 * 注文取引からレポートを作成する
 */
export function createPlaceOrderReport(params: {
    order: factory.order.IOrder;
}) {
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        const datas: IData[] = [];
        const order = params.order;

        let purchaserGroup: PurchaserGroup = PurchaserGroup.Customer;
        if (Array.isArray(order.customer.identifier)) {
            const clientIdProperty = order.customer.identifier.find((i) => i.name === 'clientId');
            if (clientIdProperty !== undefined && clientIdProperty.value === STAFF_CLIENT_ID) {
                purchaserGroup = PurchaserGroup.Staff;
            }
        }

        datas.push(
            ...order.acceptedOffers
                .map((o, index) => {
                    return reservation2data(
                        {
                            ...<factory.cinerino.order.IReservation>o.itemOffered,
                            checkins: []
                        },
                        order,
                        order.orderDate,
                        AggregateUnit.SalesByEndDate,
                        purchaserGroup,
                        index
                    );
                })
        );
        debug('creating', datas.length, 'datas...');

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
    order: factory.order.IOrder;
}) {
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        const datas: IData[] = [];

        const order = params.order;
        const reservations = order.acceptedOffers
            .filter((o) => {
                const r = <factory.cinerino.order.IReservation>o.itemOffered;
                // 余分確保分を除く
                let extraProperty: factory.propertyValue.IPropertyValue<string> | undefined;
                if (r.additionalProperty !== undefined) {
                    extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                }

                return r.additionalProperty === undefined
                    || extraProperty === undefined
                    || extraProperty.value !== '1';
            })
            .map((o) => <factory.cinerino.order.IReservation>o.itemOffered);

        let purchaserGroup: PurchaserGroup = PurchaserGroup.Customer;
        if (Array.isArray(order.customer.identifier)) {
            const clientIdProperty = order.customer.identifier.find((i) => i.name === 'clientId');
            if (clientIdProperty !== undefined && clientIdProperty.value === STAFF_CLIENT_ID) {
                purchaserGroup = PurchaserGroup.Staff;
            }
        }

        const dateReturned = moment(<Date>order.dateReturned).toDate();
        const cancellationFee = CANCELLATION_FEE;

        reservations.forEach((r, reservationIndex) => {
            // 座席分のキャンセルデータ
            datas.push({
                ...reservation2data(
                    {
                        ...r,
                        checkins: []
                    },
                    order,
                    <Date>order.dateReturned,
                    AggregateUnit.SalesByEndDate,
                    purchaserGroup,
                    reservationIndex
                ),
                reservationStatus: Status4csv.Cancelled,
                status_sort: `${r.reservationStatus}_1`,
                cancellationFee: cancellationFee,
                orderDate: moment(dateReturned).format('YYYY/MM/DD HH:mm:ss')
            });

            // 購入分のキャンセル料データ
            if (reservationIndex === 0) {
                datas.push({
                    ...reservation2data(
                        {
                            ...r,
                            checkins: []
                        },
                        order,
                        dateReturned,
                        AggregateUnit.SalesByEndDate,
                        purchaserGroup,
                        reservationIndex
                    ),
                    seat: {
                        code: '',
                        gradeName: '',
                        gradeAdditionalCharge: ''
                    },
                    ticketType: {
                        name: '',
                        charge: cancellationFee.toString(),
                        csvCode: ''
                    },
                    payment_seat_index: '',
                    reservationStatus: Status4csv.CancellationFee,
                    status_sort: `${r.reservationStatus}_2`,
                    cancellationFee: cancellationFee,
                    price: cancellationFee.toString(),
                    orderDate: moment(dateReturned).format('YYYY/MM/DD HH:mm:ss')
                });
            }
        });

        debug('creating', datas.length, 'datas...');

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
        const report = await aggregateSaleRepo.aggregateSaleModel.findOneAndUpdate(
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
        debug('report created', report._id);
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

        const result = await aggregateSaleRepo.aggregateSaleModel.update(
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
        debug('report updated', result);
    };
}

/**
 * 予約データをcsvデータ型に変換する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function reservation2data(
    r: factory.reservation.event.IReservation,
    order: factory.order.IOrder,
    targetDate: Date,
    aggregateUnit: AggregateUnit,
    purchaserGroup: PurchaserGroup,
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

    const unitPrice = (r.reservedTicket.ticketType.priceSpecification !== undefined)
        ? r.reservedTicket.ticketType.priceSpecification.price
        : 0;

    let csvCode = ((<any>r).ticket_ttts_extension !== undefined)
        ? (<any>r).ticket_ttts_extension.csv_code
        : ''; // 互換性維持のため
    if (Array.isArray(r.reservedTicket.ticketType.additionalProperty)) {
        const csvCodeProperty = r.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'csvCode');
        if (csvCodeProperty !== undefined) {
            csvCode = csvCodeProperty.value;
        }
    }

    // let paymentSeatIndex: string = ((<any>r).payment_seat_index !== undefined) ? (<any>r).payment_seat_index.toString() : ''; // 互換性維持のため
    // if (Array.isArray(r.additionalProperty)) {
    //     const paymentSeatIndexProperty = r.additionalProperty.find((p) => p.name === 'paymentSeatIndex');
    //     if (paymentSeatIndexProperty !== undefined) {
    //         paymentSeatIndex = paymentSeatIndexProperty.value;
    //     }
    // }

    // tslint:disable-next-line:no-magic-numbers
    const paymentNo = order.confirmationNumber.slice(-6); // 互換性維持のため

    return {
        payment_no: paymentNo,
        payment_seat_index: String(paymentSeatIndex),
        performance: {
            id: r.reservationFor.id,
            startDay: moment(r.reservationFor.startDate).tz('Asia/Tokyo').format('YYYYMMDD'),
            startTime: moment(r.reservationFor.startDate).tz('Asia/Tokyo').format('HHmm')
        },
        theater: {
            name: r.reservationFor.superEvent.location.name.ja
        },
        screen: {
            id: r.reservationFor.location.branchCode,
            name: r.reservationFor.location.name.ja
        },
        film: (r.reservationFor.superEvent.workPerformed !== undefined && r.reservationFor.superEvent.workPerformed !== null)
            ? {
                id: r.reservationFor.superEvent.workPerformed.identifier,
                name: r.reservationFor.superEvent.workPerformed.name
            }
            : {
                id: r.reservationFor.superEvent.id,
                name: r.reservationFor.superEvent.name.ja
            },
        seat: {
            code: (r.reservedTicket.ticketedSeat !== undefined) ? r.reservedTicket.ticketedSeat.seatNumber : '',
            gradeName: 'ノーマルシート',
            gradeAdditionalCharge: '0'
        },
        ticketType: {
            name: r.reservedTicket.ticketType.name.ja,
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
        status_sort: String(r.reservationStatus),
        price: order.price.toString(),
        cancellationFee: 0,
        date_bucket: targetDate,
        aggregateUnit: aggregateUnit
    };
}
