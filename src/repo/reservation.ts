import { Connection } from 'mongoose';

import * as factory from '@motionpicture/ttts-factory';
import ReservationModel from '../repo/mongoose/model/reservation';

export type IReservation = factory.reservation.event.IReservation;

/**
 * 予約検索条件インターフェース
 */
export interface ISearchConditions {
    orderNumbers?: string[];
    status?: factory.reservationStatusType;
    performance?: string;
    performanceId?: string;
    performances?: string[];
    performanceStartFrom?: Date;
    performanceStartThrough?: Date;
    performanceEndFrom?: Date;
    performanceEndThrough?: Date;
    purchaser_group?: factory.person.Group;
}

/**
 * 予約リポジトリ
 */
export class MongoRepository {
    public readonly reservationModel: typeof ReservationModel;

    constructor(connection: Connection) {
        this.reservationModel = connection.model(ReservationModel.modelName);
    }

    /**
     * 予約を保管する
     */
    public async saveEventReservation(reservation: factory.reservation.event.IReservation) {
        await this.reservationModel.findByIdAndUpdate(
            reservation.id,
            { $setOnInsert: reservation },
            { upsert: true }
        ).exec();
    }

    /**
     * 予約検索
     */
    public async  search(params: ISearchConditions, projection?: any | null) {
        const conditions: any[] = [];

        if (Array.isArray(params.orderNumbers)) {
            conditions.push({ order_number: { $in: params.orderNumbers } });
        }

        if (params.performance !== undefined) {
            conditions.push({ performance: params.performance });
        }

        if (params.performanceId !== undefined) {
            conditions.push({ performance: params.performanceId });
        }

        if (Array.isArray(params.performances)) {
            conditions.push({ performance: { $in: params.performances } });
        }

        if (params.status !== undefined) {
            conditions.push({ status: params.status });

        }

        if (params.purchaser_group !== undefined) {
            conditions.push({ purchaser_group: params.purchaser_group });
        }

        if (params.performanceStartFrom instanceof Date) {
            conditions.push({
                performance_start_date: {
                    $gte: params.performanceStartFrom
                }
            });
        }

        if (params.performanceStartThrough instanceof Date) {
            conditions.push({
                performance_start_date: {
                    $lte: params.performanceStartThrough
                }
            });
        }

        if (params.performanceEndFrom instanceof Date) {
            conditions.push({
                performance_end_date: {
                    $gte: params.performanceEndFrom
                }
            });
        }

        if (params.performanceEndThrough instanceof Date) {
            conditions.push({
                performance_end_date: {
                    $lte: params.performanceEndThrough
                }
            });
        }

        const docs = await this.reservationModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
            projection
        ).exec();

        return docs.map((doc) => doc.toObject());
    }

    /**
     * 予約取得
     */
    public async  findById(params: { id: string }): Promise<IReservation> {
        const doc = await this.reservationModel.findById(params.id)
            .exec();

        if (doc === null) {
            throw new factory.errors.NotFound('Reservation');
        }

        return doc.toObject();
    }

    /**
     * 予約確定
     */
    public async  confirm(params: IReservation) {
        await this.saveEventReservation(params);
    }

    /**
     * 予約取消
     */
    public async cancel(params: {
        qr_str: string;
    }) {
        await this.reservationModel.findOneAndUpdate(
            { qr_str: params.qr_str },
            { status: factory.reservationStatusType.ReservationCancelled }
        ).exec();
    }

    /**
     * 入場
     */
    public async checkIn(params: {
        id: string;
        checkin: factory.reservation.event.ICheckin;
    }): Promise<IReservation> {
        const doc = await this.reservationModel.findByIdAndUpdate(
            params.id,
            { $push: { checkins: params.checkin } },
            { new: true }
        )
            .exec();

        if (doc === null) {
            throw new factory.errors.NotFound('Reservation');
        }

        return doc.toObject();
    }

    /**
     * 入場取消
     */
    public async cancelCheckIn(params: {
        id: string;
        checkin: factory.reservation.event.ICheckin;
    }): Promise<IReservation> {
        const doc = await this.reservationModel.findByIdAndUpdate(
            params.id,
            { $pull: { checkins: { when: params.checkin.when } } },
            { new: true }
        )
            .exec();

        if (doc === null) {
            throw new factory.errors.NotFound('Reservation');
        }

        return doc.toObject();
    }
}
