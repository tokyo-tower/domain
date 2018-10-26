/**
 * 売上集計サービス
 * @namespace service.aggregate.report4sales
 */

// import * as GMO from '@motionpicture/gmo-service';
import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { MongoRepository as AggregateSaleRepo } from '../../repo/aggregateSale';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

// export type GMONotificationOperation<T> = (gmoNotificationRepository: GMONotificationRepo) => Promise<T>;
// export type IGMOResultNotification = GMO.factory.resultNotification.creditCard.IResultNotification;

const debug = createDebug('ttts-domain:service:report:health');

const POS_CLIENT_ID = process.env.POS_CLIENT_ID;
const TOP_DECK_OPEN_DATE = process.env.TOP_DECK_OPEN_DATE;
const RESERVATION_START_DATE = process.env.RESERVATION_START_DATE;

const purchaserGroupStrings: any = {
    Customer: '01',
    Staff: '04'
};
const paymentMethodStrings: any = {
    CreditCard: '0'
};

/**
 * CSVデータインターフェース
 * @interface
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
 * @export
 * @interface
 * @memberof service.report
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
 * @export
 * @interface
 * @memberof service.report
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
            datas.push(...transactionResult.eventReservations.map((r) => {
                return reservation2data(
                    r,
                    transactionResult.order.price,
                    <Date>params.transaction.endDate,
                    AggregateUnit.SalesByEndDate
                );
            }));
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
        const eventReservations = placeOrderTransactionResult.eventReservations;
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
 * 日付指定で売上データを集計する。
 * @export
 * @function
 * @param {string} targetDate 対象日付yyyy/mm/dd
 * @memberof service.aggregate
 */
export function aggregateSalesByEndDate(targetDate: string) {
    return async (
        reservationRepo: ReservationRepo,
        transactionRepo: TransactionRepo,
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {

        const prmConditons: ISearchSalesConditions = {
            reportType: 'sales',
            performanceDayFrom: targetDate,
            performanceDayTo: targetDate,
            eventStartFrom: targetDate,
            eventStartThrough: targetDate,
            owner_username: null,
            performanceStartHour1: null,
            performanceStartMinute1: null,
            performanceStartHour2: null,
            performanceStartMinute2: null
        };

        const transactionEndDateBucket = moment(targetDate).toDate();

        // let filename = '売上げレポート';
        const placeOrderTransactions = await searchPlaceOrderTransactions4reportByEndDate(prmConditons, transactionRepo);
        const reservations = await placeOrderTransactions2reservationDatas(
            placeOrderTransactions,
            reservationRepo,
            transactionEndDateBucket,
            AggregateUnit.SalesByEndDate
        );

        const returnOrderTransactions = await searchReturnOrderTransactions4reportByEndDate(prmConditons, transactionRepo);
        const cancels = await returnOrderTransactions2cancelDatas(
            returnOrderTransactions,
            reservationRepo,
            transactionEndDateBucket,
            AggregateUnit.SalesByEndDate
        );

        const datas = [...reservations, ...cancels];

        debug(datas);

        try {
            await aggregateSaleRepo.aggregateSaleModel.remove(
                { date_bucket: datas[0].date_bucket, aggregateUnit: AggregateUnit.SalesByEndDate }).exec();
            await aggregateSaleRepo.aggregateSaleModel.create(datas).catch((reason) => {
                if (reason) { throw Error(reason); }
            });
        } catch (err) {
            console.error(err);
        }

    };
}

/**
 * 日付指定で売上データを集計する。
 * @export
 * @function
 * @param {string} targetDate 対象日付yyyy/mm/dd
 * @memberof service.aggregate
 */
export function aggregateSalesByEventStartDate(targetDate: string) {
    return async (
        reservationRepo: ReservationRepo,
        transactionRepo: TransactionRepo,
        aggregateSaleRepo: AggregateSaleRepo
    ): Promise<void> => {

        const prmConditons: ISearchSalesConditions = {
            reportType: 'sales',
            performanceDayFrom: targetDate,
            performanceDayTo: targetDate,
            eventStartFrom: targetDate,
            eventStartThrough: targetDate,
            owner_username: null,
            performanceStartHour1: null,
            performanceStartMinute1: null,
            performanceStartHour2: null,
            performanceStartMinute2: null
        };

        const transactionEndDateBucket = moment(targetDate).toDate();

        // let filename = '売上げレポート';
        const placeOrderTransactions = await searchPlaceOrderTransactions4reportByEventStartDate(prmConditons, transactionRepo);
        const reservations = await placeOrderTransactions2reservationDatas(
            placeOrderTransactions,
            reservationRepo,
            transactionEndDateBucket,
            AggregateUnit.SalesByEventStartDate
        );

        const returnOrderTransactions = await searchReturnOrderTransactions4reportByEventStartDate(prmConditons, transactionRepo);
        const cancels = await returnOrderTransactions2cancelDatas(
            returnOrderTransactions,
            reservationRepo,
            transactionEndDateBucket,
            AggregateUnit.SalesByEventStartDate
        );

        const datas = [...reservations, ...cancels];

        debug(datas);

        try {
            await aggregateSaleRepo.aggregateSaleModel.remove(
                { date_bucket: datas[0].date_bucket, aggregateUnit: AggregateUnit.SalesByEventStartDate }).exec();
            await aggregateSaleRepo.aggregateSaleModel.create(datas).catch((reason) => {
                if (reason) { throw Error(reason); }
            });
        } catch (err) {
            console.error(err);
        }

    };
}

async function searchPlaceOrderTransactions4reportByEndDate(
    searchConditions: ISearchSalesConditions,
    transactionRepo: TransactionRepo
): Promise<factory.transaction.placeOrder.ITransaction[]> {
    // 検索条件を作成
    const conditions: any = {
        typeOf: factory.transactionType.PlaceOrder,
        status: factory.transactionStatusType.Confirmed,
        'object.purchaser_group': {
            $exists: true,
            $eq: factory.person.Group.Customer
        }
    };

    if (POS_CLIENT_ID !== undefined) {
        // POS購入除外(一時的に除外機能オフ)
        // conditions['agent.id'] = { $ne: POS_CLIENT_ID };
    }

    // 集計期間
    // 予約開始日時の設定があれば、それ以前は除外
    const minEndFrom =
        (RESERVATION_START_DATE !== undefined) ? moment(RESERVATION_START_DATE) : moment('2017-01-01T00:00:00Z');
    const conditionsDate: any = {
        $exists: true,
        $gte: minEndFrom.toDate()
    };
    if (searchConditions.performanceDayFrom !== null || searchConditions.performanceDayTo !== null) {
        // 登録日From
        if (searchConditions.performanceDayFrom !== null) {
            // 売上げ
            const endFrom = moment(`${searchConditions.performanceDayFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ');
            conditionsDate.$gte = moment.max(endFrom, minEndFrom).toDate();
        }
        // 登録日To
        if (searchConditions.performanceDayTo !== null) {
            // 売上げ
            conditionsDate.$lt =
                moment(`${searchConditions.performanceDayTo}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ').add(1, 'days').toDate();
        }
    }
    conditions.endDate = conditionsDate;

    debug('finding transactions...', conditions);
    const transactions = await transactionRepo.transactionModel.find(conditions).exec()
        .then((docs) => docs.map((doc) => <factory.transaction.placeOrder.ITransaction>doc.toObject()));
    debug(`${transactions.length} transactions found.`);

    return transactions;
}

async function searchPlaceOrderTransactions4reportByEventStartDate(
    searchConditions: ISearchSalesConditions,
    transactionRepo: TransactionRepo
): Promise<factory.transaction.placeOrder.ITransaction[]> {
    // 検索条件を作成
    const conditions: any = {
        typeOf: factory.transactionType.PlaceOrder,
        status: factory.transactionStatusType.Confirmed,
        'object.purchaser_group': {
            $exists: true,
            $eq: factory.person.Group.Customer
        }
    };

    if (POS_CLIENT_ID !== undefined) {
        // POS購入除外(一時的に除外機能オフ)
        // conditions['agent.id'] = { $ne: POS_CLIENT_ID };
    }

    // イベント開始日時条件を追加
    conditions['result.eventReservations.performance_start_date'] = {
        $exists: true
    };

    let returnTransactions: factory.transaction.placeOrder.ITransaction[] = [];
    const fromD = moment(`${searchConditions.eventStartFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ');
    const toD = moment(`${searchConditions.eventStartThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ');
    const cnt = toD.diff(fromD, 'days');
    const iterateMin = 15;
    const performanceCntPerDay = 53;
    for (let c = 0; c < cnt + 1; c += 1) {
        const m = moment(`${searchConditions.eventStartFrom}T09:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ').add('days', c);
        const dateConditios = [];
        for (let i = 0; i < performanceCntPerDay; i += 1) {
            if (i === 0) {
                dateConditios.push(
                    { 'result.eventReservations.performance_start_date': m.toDate() }
                );
            } else {
                dateConditios.push(
                    { 'result.eventReservations.performance_start_date': m.add('minutes', iterateMin).toDate() }
                );
            }
        }
        conditions.$or = dateConditios;
        debug('finding transactions...', conditions);
        const transactions = await transactionRepo.transactionModel.find(conditions).exec()
            .then((docs) => docs.map((doc) => <factory.transaction.placeOrder.ITransaction>doc.toObject()));
        debug(`${transactions.length} transactions found.`);
        returnTransactions = returnTransactions.concat(transactions);
    }

    return returnTransactions;
}

async function placeOrderTransactions2reservationDatas(
    placeOrderTransactions: factory.transaction.placeOrder.ITransaction[],
    reservationRepo: ReservationRepo,
    targetDate: Date,
    aggregateUnit: AggregateUnit
): Promise<IData[]> {
    let transactions = placeOrderTransactions;

    // オープン前のPOS購入を除外
    if (POS_CLIENT_ID !== undefined && TOP_DECK_OPEN_DATE !== undefined) {
        const topDeckOpenDate = moment(TOP_DECK_OPEN_DATE).toDate();
        transactions = transactions.filter((t) => {
            // エージェントがPOSでない、あるいは、オープン日時以降の取引であればOK
            return (t.agent.id !== POS_CLIENT_ID || moment(t.endDate).toDate() >= topDeckOpenDate);
        });
    }

    // 取引で作成された予約データを取得
    debug('finding reservations...');
    const orderNumbers = transactions.map((t) => (<factory.transaction.placeOrder.IResult>t.result).order.orderNumber);
    const reservations = await reservationRepo.reservationModel.find(
        { order_number: { $in: orderNumbers } }
    ).exec().then((docs) => docs.map((doc) => <factory.reservation.event.IReservation>doc.toObject()));
    debug(`${reservations.length} reservations found.`);

    // 予約情報をセット
    const datas: IData[] = [];
    // 取引数分Loop
    for (const transaction of transactions) {
        const transactionResult = <factory.transaction.placeOrder.IResult>transaction.result;
        // 取引から予約情報取得
        const eventReservations = reservations.filter((r) => r.order_number === transactionResult.order.orderNumber);
        eventReservations.forEach((r) => {
            datas.push(reservation2data(r, transactionResult.order.price, targetDate, aggregateUnit));
        });
    }
    debug('datas created.');

    return datas;
}

async function searchReturnOrderTransactions4reportByEventStartDate(
    searchConditions: ISearchSalesConditions,
    transactionRepo: TransactionRepo
): Promise<factory.transaction.returnOrder.ITransaction[]> {
    // 検索条件を作成
    const conditions: any = {
        typeOf: factory.transactionType.ReturnOrder,
        status: factory.transactionStatusType.Confirmed,
        'object.transaction.object.purchaser_group': {
            $exists: true,
            $eq: factory.person.Group.Customer
        }
    };

    if (POS_CLIENT_ID !== undefined) {
        // POS購入除外(一時的に除外機能オフ)
        // conditions['object.transaction.agent.id'] = { $ne: POS_CLIENT_ID };
    }

    // イベント開始日時条件を追加
    // conditions['object.transaction.result.eventReservations.performance_start_date'] = {
    //     $type: 'date'
    // };
    // if (searchConditions.eventStartFrom !== null) {
    //     conditions['object.transaction.result.eventReservations.performance_start_date'].$gte =
    //         moment(`${searchConditions.eventStartFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ').toDate();
    // }
    // if (searchConditions.eventStartThrough !== null) {
    //     conditions['object.transaction.result.eventReservations.performance_start_date'].$lt =
    //         moment(`${searchConditions.eventStartThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ').add(1, 'day').toDate();
    // }

    // debug('finding transactions...', conditions);
    // const transactions = await transactionRepo.transactionModel.find(conditions).exec()
    //     .then((docs) => docs.map((doc) => <factory.transaction.returnOrder.ITransaction>doc.toObject()));
    // debug(`${transactions.length} transactions found.`);

    // return transactions;

    let returnTransactions: factory.transaction.returnOrder.ITransaction[] = [];
    const fromD = moment(`${searchConditions.eventStartFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ');
    const toD = moment(`${searchConditions.eventStartThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ');
    const cnt = toD.diff(fromD, 'days');
    const iterateMin = 15;
    const performanceCntPerDay = 53;
    for (let c = 0; c < cnt + 1; c += 1) {
        const m = moment(`${searchConditions.eventStartFrom}T09:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ').add('days', c);
        const dateConditios = [];
        for (let i = 0; i < performanceCntPerDay; i += 1) {
            if (i === 0) {
                dateConditios.push(
                    { 'object.transaction.result.eventReservations.performance_start_date': m.toDate() }
                );
            } else {
                dateConditios.push(
                    { 'object.transaction.result.eventReservations.performance_start_date': m.add('minutes', iterateMin).toDate() }
                );
            }
        }
        conditions.$or = dateConditios;
        debug('finding transactions...', conditions);
        const transactions = await transactionRepo.transactionModel.find(conditions).exec()
            .then((docs) => docs.map((doc) => <factory.transaction.returnOrder.ITransaction>doc.toObject()));
        debug(`${transactions.length} transactions found.`);
        returnTransactions = returnTransactions.concat(transactions);
    }

    return returnTransactions;
}

/**
 * 予約データをcsvデータ型に変換する
 * @param {factory.reservation.event.IReservation} r 予約データ
 * @param {number} orderPrice 注文金額
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
            startDay: r.performance_day,
            startTime: r.performance_start_time
        },
        theater: {
            name: r.theater_name.ja
        },
        screen: {
            id: r.screen,
            name: r.screen_name.ja
        },
        film: {
            id: r.film,
            name: r.film_name.ja
        },
        seat: {
            code: r.seat_code,
            gradeName: r.seat_grade_name.ja,
            gradeAdditionalCharge: r.seat_grade_additional_charge.toString()
        },
        ticketType: {
            name: r.ticket_type_name.ja,
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

async function searchReturnOrderTransactions4reportByEndDate(
    searchConditions: ISearchSalesConditions,
    transactionRepo: TransactionRepo
): Promise<factory.transaction.returnOrder.ITransaction[]> {
    // 検索条件を作成
    const conditions: any = {
        typeOf: factory.transactionType.ReturnOrder,
        status: factory.transactionStatusType.Confirmed,
        'object.transaction.object.purchaser_group': {
            $exists: true,
            $eq: factory.person.Group.Customer
        }
    };

    if (POS_CLIENT_ID !== undefined) {
        // POS購入除外(一時的に除外機能オフ)
        // conditions['object.transaction.agent.id'] = { $ne: POS_CLIENT_ID };
    }

    // 集計期間
    // 予約開始日時の設定があれば、それ以前は除外
    const minEndFrom =
        (RESERVATION_START_DATE !== undefined) ? moment(RESERVATION_START_DATE) : moment('2017-01-01T00:00:00Z');
    const conditionsDate: any = {
        $exists: true,
        $gte: minEndFrom.toDate()
    };
    if (searchConditions.performanceDayFrom !== null || searchConditions.performanceDayTo !== null) {
        // 登録日From
        if (searchConditions.performanceDayFrom !== null) {
            // 売上げ
            const endFrom = moment(`${searchConditions.performanceDayFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ');
            conditionsDate.$gte = moment.max(endFrom, minEndFrom).toDate();
        }
        // 登録日To
        if (searchConditions.performanceDayTo !== null) {
            // 売上げ
            conditionsDate.$lt =
                moment(`${searchConditions.performanceDayTo}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ').add(1, 'days').toDate();
        }
    }
    conditions.endDate = conditionsDate;

    debug('finding transactions...', conditions);
    const transactions = await transactionRepo.transactionModel.find(conditions).exec()
        .then((docs) => docs.map((doc) => <factory.transaction.returnOrder.ITransaction>doc.toObject()));
    debug(`${transactions.length} transactions found.`);

    return transactions;
}

async function returnOrderTransactions2cancelDatas(
    returnOrderTransactions: factory.transaction.returnOrder.ITransaction[],
    reservationRepo: ReservationRepo,
    targetDate: Date,
    aggregateUnit: AggregateUnit
): Promise<IData[]> {
    let transactions = returnOrderTransactions;

    // オープン前のPOS購入を除外
    if (POS_CLIENT_ID !== undefined && TOP_DECK_OPEN_DATE !== undefined) {
        const topDeckOpenDate = moment(TOP_DECK_OPEN_DATE).toDate();
        transactions = transactions.filter((t) => {
            // エージェントがPOSでない、あるいは、オープン日時以降の取引であればOK
            return (t.object.transaction.agent.id !== POS_CLIENT_ID || moment(t.object.transaction.endDate).toDate() >= topDeckOpenDate);
        });
    }

    // 取引で作成された予約データを取得
    const placeOrderTransactions = transactions.map((t) => t.object.transaction);
    const orderNumbers = placeOrderTransactions.map((t) => (<factory.transaction.placeOrder.IResult>t.result).order.orderNumber);
    const reservations = await reservationRepo.reservationModel.find(
        { order_number: { $in: orderNumbers } }
    ).exec().then((docs) => docs.map((doc) => <factory.reservation.event.IReservation>doc.toObject()));
    debug(`${reservations.length} reservations found.`);

    const datas: IData[] = [];

    transactions.forEach((returnOrderTransaction) => {
        // 取引からキャンセル予約情報取得
        const placeOrderTransaction = returnOrderTransaction.object.transaction;
        const placeOrderTransactionResult = <factory.transaction.placeOrder.IResult>placeOrderTransaction.result;
        const eventReservations = reservations.filter((r) => r.order_number === placeOrderTransactionResult.order.orderNumber);
        for (const r of eventReservations) {
            // 座席分のキャンセルデータ
            datas.push({
                ...reservation2data(r, placeOrderTransactionResult.order.price, targetDate, aggregateUnit),
                reservationStatus: Status4csv.Cancelled,
                status_sort: `${r.status}_1`,
                cancellationFee: returnOrderTransaction.object.cancellationFee,
                orderDate: moment(<Date>returnOrderTransaction.endDate).format('YYYY/MM/DD HH:mm:ss')
            });

            // 購入分のキャンセル料データ
            if (r.payment_seat_index === 0) {
                datas.push({
                    ...reservation2data(r, placeOrderTransactionResult.order.price, targetDate, aggregateUnit),
                    seat: {
                        code: '',
                        gradeName: '',
                        gradeAdditionalCharge: ''
                    },
                    ticketType: {
                        name: '',
                        charge: returnOrderTransaction.object.cancellationFee.toString(),
                        csvCode: ''
                    },
                    payment_seat_index: '',
                    reservationStatus: Status4csv.CancellationFee,
                    status_sort: `${r.status}_2`,
                    cancellationFee: returnOrderTransaction.object.cancellationFee,
                    price: returnOrderTransaction.object.cancellationFee.toString(),
                    orderDate: moment(<Date>returnOrderTransaction.endDate).format('YYYY/MM/DD HH:mm:ss')
                });
            }
        }
    });

    return datas;
}
