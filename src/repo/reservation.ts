import { Connection } from 'mongoose';

import * as factory from '@motionpicture/ttts-factory';

import ReservationModel from '../repo/mongoose/model/reservation';

export type IReservation = factory.reservation.event.IReservation;
export type ISearchConditions = factory.reservation.event.ISearchConditions;

/**
 * 予約リポジトリ
 */
export class MongoRepository {
    private readonly reservationModel: typeof ReservationModel;

    constructor(connection: Connection) {
        this.reservationModel = connection.model(ReservationModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: ISearchConditions) {
        const andConditions: any[] = [];

        if (Array.isArray(params.ids)) {
            andConditions.push({ _id: { $in: params.ids } });
        }

        if (params.checkins !== undefined) {
            andConditions.push({ checkins: params.checkins });
        }

        if (Array.isArray(params.orderNumbers)) {
            andConditions.push({ order_number: { $in: params.orderNumbers } });
        }

        if (params.performance !== undefined) {
            andConditions.push({ performance: params.performance });
        }

        if (Array.isArray(params.performances)) {
            andConditions.push({ performance: { $in: params.performances } });
        }

        if (params.status !== undefined) {
            andConditions.push({ status: params.status });

        }

        if (params.purchaser_group !== undefined) {
            andConditions.push({ purchaser_group: params.purchaser_group });
        }

        if (params.performanceStartFrom instanceof Date) {
            andConditions.push({
                performance_start_date: {
                    $gte: params.performanceStartFrom
                }
            });
        }

        if (params.performanceStartThrough instanceof Date) {
            andConditions.push({
                performance_start_date: {
                    $lte: params.performanceStartThrough
                }
            });
        }

        if (params.performanceEndFrom instanceof Date) {
            andConditions.push({
                performance_end_date: {
                    $gte: params.performanceEndFrom
                }
            });
        }

        if (params.performanceEndThrough instanceof Date) {
            andConditions.push({
                performance_end_date: {
                    $lte: params.performanceEndThrough
                }
            });
        }

        // 来塔日
        if (params.performance_day !== undefined) {
            andConditions.push({ performance_day: params.performance_day });
        }

        // 開始時間
        if (params.performanceStartTimeFrom !== undefined) {
            andConditions.push({ performance_start_time: { $gte: params.performanceStartTimeFrom } });
        }
        if (params.performanceStartTimeTo !== undefined) {
            andConditions.push({ performance_start_time: { $lte: params.performanceStartTimeTo } });
        }

        // 購入番号
        if (params.payment_no !== undefined) {
            andConditions.push({ payment_no: { $regex: `${params.payment_no}` } });
        }

        // アカウント
        if (params.owner_username !== undefined) {
            andConditions.push({ owner_username: params.owner_username });
        }

        if (params.transactionAgentId !== undefined) {
            andConditions.push({ 'transaction_agent.id': params.transactionAgentId });
        }

        // 決済手段
        if (params.paymentMethod !== undefined) {
            andConditions.push({ payment_method: params.paymentMethod });
        }

        // 名前
        if (params.purchaserLastName !== undefined) {
            andConditions.push({ purchaser_last_name: new RegExp(params.purchaserLastName, 'i') }); // 大文字小文字区別しない
        }
        if (params.purchaserFirstName !== undefined) {
            andConditions.push({ purchaser_first_name: new RegExp(params.purchaserFirstName, 'i') }); // 大文字小文字区別しない
        }
        // メアド
        if (params.purchaserEmail !== undefined) {
            andConditions.push({ purchaser_email: params.purchaserEmail });
        }
        // 電話番号
        if (params.purchaserTel !== undefined) {
            andConditions.push({ purchaser_tel: new RegExp(`${params.purchaserTel}$`) });
        }
        // メモ
        if (params.watcherName !== undefined) {
            andConditions.push({ watcher_name: new RegExp(params.watcherName, 'i') }); // 大文字小文字区別しない
        }

        return andConditions;
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

    public async count(params: ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.reservationModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 予約検索
     */
    public async  search(params: ISearchConditions, projection?: any | null): Promise<IReservation[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        const query = this.reservationModel.find(
            (andConditions.length > 0) ? { $and: andConditions } : {},
            {
                __v: 0,
                ...projection
            }
        );

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * 予約検索
     */
    public async  distinct(field: string, params: ISearchConditions): Promise<any[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        const query = this.reservationModel.distinct(
            field,
            (andConditions.length > 0) ? { $and: andConditions } : {}
        );

        return query.setOptions({ maxTimeMS: 10000 })
            .exec();
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
        id: string;
    }) {
        await this.reservationModel.findOneAndUpdate(
            { _id: params.id },
            {
                reservationStatus: factory.reservationStatusType.ReservationCancelled,
                status: factory.reservationStatusType.ReservationCancelled
            }
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

    /**
     * 鑑賞者更新
     */
    public async updateWatcher(
        conditions: {
            _id: string;
            status?: factory.reservationStatusType;
        },
        update: {
            watcher_name?: string;
            watcher_name_updated_at?: Date;
        }
    ): Promise<IReservation | null> {
        const doc = await this.reservationModel.findOneAndUpdate(
            conditions,
            update,
            { new: true }
        ).exec();

        return (doc !== null) ? doc.toObject() : null;
    }
}
