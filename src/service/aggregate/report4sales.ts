/**
 * 売上集計サービス
 */
import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { MongoRepository as AggregateSaleRepo } from '../../repo/aggregateSale';

const debug = createDebug('ttts-domain:service');

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

export type ReportType = 'sales' | 'salesByEventStartDate' | 'salesByAccount';

export interface ISearchSalesConditions {
    reportType: ReportType | null;
    performanceDayFrom: string | null;
    performanceDayTo: string | null;
    // 登録日
    eventStartFrom: string | null;
    eventStartThrough: string | null;
    // アカウント
    owner_username: string | null;
    // 時刻From
    performanceStartHour1: string | null;
    performanceStartMinute1: string | null;
    // 時刻To
    performanceStartHour2: string | null;
    performanceStartMinute2: string | null;
}

/**
 * GMO売上健康診断レポートインターフェース
 */
export interface IReportOfGMOSalesHealthCheck {
    madeFrom: Date;
    madeThrough: Date;
    numberOfSales: number;
    totalAmount: number;
    totalAmountCurrency: factory.priceCurrency;
    unhealthGMOSales: IUnhealthGMOSale[];
}

/**
 * 不健康なGMO売上インターフェース
 */
export interface IUnhealthGMOSale {
    orderId: string;
    amount: number;
    reason: string;
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

            datas.push(
                ...transactionResult.eventReservations
                    .filter((r) => {
                        // 余分確保分を除く
                        let extraProperty: factory.propertyValue.IPropertyValue<string> | undefined;
                        if (r.additionalProperty !== undefined) {
                            extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                        }

                        return r.additionalProperty === undefined
                            || extraProperty === undefined
                            || extraProperty.value !== '1';
                    })
                    .map((r) => {
                        return reservation2data(
                            r,
                            transactionResult.order.price,
                            <Date>params.transaction.endDate,
                            AggregateUnit.SalesByEndDate
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
        const eventReservations = placeOrderTransactionResult.eventReservations.filter((r) => {
            // 余分確保分を除く
            let extraProperty: factory.propertyValue.IPropertyValue<string> | undefined;
            if (r.additionalProperty !== undefined) {
                extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
            }

            return r.additionalProperty === undefined
                || extraProperty === undefined
                || extraProperty.value !== '1';
        });

        for (const r of eventReservations) {
            // 座席分のキャンセルデータ
            datas.push({
                ...reservation2data(
                    r,
                    placeOrderTransactionResult.order.price,
                    <Date>params.transaction.endDate,
                    AggregateUnit.SalesByEndDate
                ),
                reservationStatus: Status4csv.Cancelled,
                status_sort: `${r.status}_1`,
                cancellationFee: params.transaction.object.cancellationFee,
                orderDate: moment(<Date>params.transaction.endDate).format('YYYY/MM/DD HH:mm:ss')
            });

            // 購入分のキャンセル料データ
            if (r.payment_seat_index === 0) {
                datas.push({
                    ...reservation2data(
                        r,
                        placeOrderTransactionResult.order.price,
                        <Date>params.transaction.endDate,
                        AggregateUnit.SalesByEndDate
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
                    status_sort: `${r.status}_2`,
                    cancellationFee: params.transaction.object.cancellationFee,
                    price: params.transaction.object.cancellationFee.toString(),
                    orderDate: moment(<Date>params.transaction.endDate).format('YYYY/MM/DD HH:mm:ss')
                });
            }
        }

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
        debug('report created', report);
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
        const result = await aggregateSaleRepo.aggregateSaleModel.update(
            {
                'performance.id': params.reservation.performance,
                payment_no: params.reservation.payment_no,
                payment_seat_index: params.reservation.payment_seat_index
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
function reservation2data(
    r: factory.reservation.event.IReservation,
    orderPrice: number,
    targetDate: Date,
    aggregateUnit: AggregateUnit
): IData {
    // 客層取得 (購入者居住国：2桁、年代：2桁、性別：1桁)
    const locale = (r.purchaser_address !== undefined) ? r.purchaser_address : '';
    const age = (r.purchaser_age !== undefined) ? r.purchaser_age : '';
    const gender = (r.purchaser_gender !== undefined) ? r.purchaser_gender : '';
    const customerSegment = (locale !== '' ? locale : '__') + (age !== '' ? age : '__') + (gender !== '' ? gender : '_');

    return {
        payment_no: r.payment_no,
        payment_seat_index: r.payment_seat_index.toString(),
        performance: {
            id: r.performance,
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
        film: {
            id: r.reservationFor.superEvent.id,
            name: r.reservationFor.superEvent.name.ja
        },
        seat: {
            code: r.seat_code,
            gradeName: r.seat_grade_name.ja,
            gradeAdditionalCharge: r.seat_grade_additional_charge.toString()
        },
        ticketType: {
            name: r.reservedTicket.ticketType.name.ja,
            // リリース当初の間違ったマスターデータをカバーするため
            csvCode: (r.ticket_ttts_extension.csv_code === '0000000000231') ? '10031' : r.ticket_ttts_extension.csv_code,
            charge: r.charge.toString()
        },
        customer: {
            group: (purchaserGroupStrings[r.purchaser_group] !== undefined)
                ? purchaserGroupStrings[r.purchaser_group]
                : r.purchaser_group,
            givenName: r.purchaser_first_name,
            familyName: r.purchaser_last_name,
            email: r.purchaser_email,
            telephone: r.purchaser_tel,
            segment: customerSegment,
            username: (r.owner_username !== undefined) ? r.owner_username : ''
        },
        orderDate: moment(r.purchased_at).format('YYYY/MM/DD HH:mm:ss'),
        paymentMethod: (paymentMethodStrings[r.payment_method] !== undefined)
            ? paymentMethodStrings[r.payment_method]
            : r.payment_method,
        checkedin: r.checkins.length > 0 ? 'TRUE' : 'FALSE',
        checkinDate: r.checkins.length > 0 ? moment(r.checkins[0].when).format('YYYY/MM/DD HH:mm:ss') : '',
        reservationStatus: Status4csv.Reserved,
        status_sort: r.status,
        price: orderPrice.toString(),
        cancellationFee: 0,
        date_bucket: targetDate,
        aggregateUnit: aggregateUnit
    };
}
