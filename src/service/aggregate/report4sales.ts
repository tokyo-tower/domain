/**
 * 売上集計サービス
 */
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { MongoRepository as AggregateSaleRepo } from '../../repo/aggregateSale';

const debug = createDebug('ttts-domain:service');
const STAFF_CLIENT_ID = process.env.STAFF_CLIENT_ID;

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
export function createPlaceOrderReport(params: { transaction: factory.transaction.placeOrder.ITransaction }) {
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        const datas: IData[] = [];
        if (params.transaction.endDate !== undefined) {
            const transactionResult = <factory.transaction.placeOrder.IResult>params.transaction.result;

            let purchaserGroup: PurchaserGroup = PurchaserGroup.Customer;
            if (params.transaction.object.clientUser !== undefined
                && params.transaction.object.clientUser.client_id === STAFF_CLIENT_ID) {
                purchaserGroup = PurchaserGroup.Staff;
            }

            datas.push(
                ...transactionResult.order.acceptedOffers
                    .map((o) => {
                        return reservation2data(
                            {
                                ...o.itemOffered,
                                checkins: []
                            },
                            transactionResult.order,
                            <Date>params.transaction.endDate,
                            AggregateUnit.SalesByEndDate,
                            purchaserGroup
                        );
                    })
            );
        }
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
export function createReturnOrderReport(params: { transaction: factory.transaction.returnOrder.ITransaction }) {
    return async (
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {
        const datas: IData[] = [];

        // 取引からキャンセル予約情報取得
        const placeOrderTransaction = params.transaction.object.transaction;
        const placeOrderTransactionResult = <factory.transaction.placeOrder.IResult>placeOrderTransaction.result;
        const reservations = placeOrderTransactionResult.order.acceptedOffers
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
            .map((o) => o.itemOffered);

        let purchaserGroup: PurchaserGroup = PurchaserGroup.Customer;
        if (placeOrderTransaction.object.clientUser !== undefined
            && placeOrderTransaction.object.clientUser.client_id === STAFF_CLIENT_ID) {
            purchaserGroup = PurchaserGroup.Staff;
        }

        reservations.forEach((r, reservationIndex) => {
            // 座席分のキャンセルデータ
            datas.push({
                ...reservation2data(
                    {
                        ...r,
                        checkins: []
                    },
                    placeOrderTransactionResult.order,
                    <Date>params.transaction.endDate,
                    AggregateUnit.SalesByEndDate,
                    purchaserGroup
                ),
                reservationStatus: Status4csv.Cancelled,
                status_sort: `${r.reservationStatus}_1`,
                cancellationFee: params.transaction.object.cancellationFee,
                orderDate: moment(<Date>params.transaction.endDate).format('YYYY/MM/DD HH:mm:ss')
            });

            // 購入分のキャンセル料データ
            if (reservationIndex === 0) {
                datas.push({
                    ...reservation2data(
                        {
                            ...r,
                            checkins: []
                        },
                        placeOrderTransactionResult.order,
                        <Date>params.transaction.endDate,
                        AggregateUnit.SalesByEndDate,
                        purchaserGroup
                    ),
                    seat: {
                        code: '',
                        gradeName: '',
                        gradeAdditionalCharge: ''
                    },
                    ticketType: {
                        name: '',
                        charge: params.transaction.object.cancellationFee.toString(),
                        csvCode: ''
                    },
                    payment_seat_index: '',
                    reservationStatus: Status4csv.CancellationFee,
                    status_sort: `${r.reservationStatus}_2`,
                    cancellationFee: params.transaction.object.cancellationFee,
                    price: params.transaction.object.cancellationFee.toString(),
                    orderDate: moment(<Date>params.transaction.endDate).format('YYYY/MM/DD HH:mm:ss')
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
    purchaserGroup: PurchaserGroup
): IData {
    const underName = r.underName;
    let age = '';
    if (underName !== undefined && Array.isArray(underName.identifier)) {
        const ageProperty = underName.identifier.find((p) => p.name === 'age');
        if (ageProperty !== undefined) {
            age = ageProperty.value;
        }
    }

    let username = '';
    if (underName !== undefined && Array.isArray(underName.identifier)) {
        const usernameProperty = underName.identifier.find((p) => p.name === 'username');
        if (usernameProperty !== undefined) {
            username = usernameProperty.value;
        }
    }

    let paymentMethod = '';
    if (underName !== undefined && Array.isArray(underName.identifier)) {
        const paymentMethodProperty = underName.identifier.find((p) => p.name === 'paymentMethod');
        if (paymentMethodProperty !== undefined) {
            paymentMethod = paymentMethodProperty.value;
        }
    }

    // 客層取得 (購入者居住国：2桁、年代：2桁、性別：1桁)
    const locale = (underName !== undefined && (<any>underName).address !== undefined) ? String((<any>underName).address) : '';
    const gender = (underName !== undefined && underName.gender !== undefined) ? underName.gender : '';
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

    let paymentSeatIndex: string = ((<any>r).payment_seat_index !== undefined) ? (<any>r).payment_seat_index.toString() : ''; // 互換性維持のため
    if (Array.isArray(r.additionalProperty)) {
        const paymentSeatIndexProperty = r.additionalProperty.find((p) => p.name === 'paymentSeatIndex');
        if (paymentSeatIndexProperty !== undefined) {
            paymentSeatIndex = paymentSeatIndexProperty.value;
        }
    }

    let paymentNo = r.reservationNumber; // 互換性維持のため
    if (r.underName !== undefined && Array.isArray(r.underName.identifier)) {
        const paymentNoProperty = r.underName.identifier.find((p) => p.name === 'paymentNo');
        if (paymentNoProperty !== undefined) {
            paymentNo = paymentNoProperty.value;
        }
    }

    return {
        payment_no: paymentNo,
        payment_seat_index: paymentSeatIndex,
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
            givenName: (underName !== undefined && underName.givenName !== undefined) ? underName.givenName : '',
            familyName: (underName !== undefined && underName.familyName !== undefined) ? underName.familyName : '',
            email: (underName !== undefined && underName.email !== undefined) ? underName.email : '',
            telephone: (underName !== undefined && underName.telephone !== undefined) ? underName.telephone : '',
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
