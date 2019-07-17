import { Connection } from 'mongoose';
import AggregateSaleModel from './mongoose/model/aggregateSale';

/**
 * 売上集計レポジトリー
 */
export class MongoRepository {
    public readonly aggregateSaleModel: typeof AggregateSaleModel;

    constructor(connection: Connection) {
        this.aggregateSaleModel = connection.model(AggregateSaleModel.modelName);
    }
}
