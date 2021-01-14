import * as factory from '@tokyotower/factory';

import { Connection } from 'mongoose';
import AggregateSaleModel from './mongoose/model/aggregateSale';

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
    public async saveReport(params: factory.report.order.IReport): Promise<void> {
        await this.aggregateSaleModel.findOneAndUpdate(
            {
                'reservation.id': {
                    $exists: true,
                    $eq: params.reservation.id
                },
                category: params.category
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
        checkedin: string;
        checkinDate: string;
    }): Promise<void> {
        await this.aggregateSaleModel.update(
            {
                'reservation.id': {
                    $exists: true,
                    $eq: params.reservation.id
                }
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
