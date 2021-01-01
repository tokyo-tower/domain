import * as factory from '@tokyotower/factory';

import { Connection } from 'mongoose';
import AggregateSaleModel from './mongoose/model/aggregateSale';

/**
 * レポートインターフェース
 */
export interface IReport {
    project: factory.chevre.project.IProject;
    reservation: { id: string };
    // 購入番号
    payment_no: string;
    payment_seat_index?: number;
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
}

// CSV用のステータスコード
export enum Status4csv {
    Reserved = 'RESERVED',
    Cancelled = 'CANCELLED',
    // キャンセル行ステータス
    CancellationFee = 'CANCELLATION_FEE'
}

/**
 * レポートリポジトリ
 */
export class MongoRepository {
    public readonly aggregateSaleModel: typeof AggregateSaleModel;

    constructor(connection: Connection) {
        this.aggregateSaleModel = connection.model(AggregateSaleModel.modelName);
    }

    /**
     * レポートを保管する
     */
    public async saveReport(params: IReport): Promise<void> {
        await this.aggregateSaleModel.findOneAndUpdate(
            {
                'performance.id': params.performance.id,
                payment_no: params.payment_no,
                payment_seat_index: params.payment_seat_index,
                reservationStatus: params.reservationStatus
            },
            params,
            { new: true, upsert: true }
        )
            .exec();
    }

    /**
     * 入場状態を更新する
     */
    public async updateAttendStatus(params: {
        reservation: { id: string };
        // performance: { id: string };
        // payment_no: string;
        // payment_seat_index: number;
        checkedin: string;
        checkinDate: string;
    }): Promise<void> {
        await this.aggregateSaleModel.update(
            {
                'reservation.id': {
                    $exists: true,
                    $eq: params.reservation.id
                }
                // 'performance.id': params.performance.id,
                // payment_no: params.payment_no,
                // payment_seat_index: params.payment_seat_index
            },
            {
                checkedin: params.checkedin,
                checkinDate: params.checkinDate
            },
            { multi: true }
        )
            .exec();
    }
}
