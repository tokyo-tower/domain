import { Connection } from 'mongoose';

import StockModel from '../repo/mongoose/model/stock';

/**
 * 在庫レポジトリー
 * @class repository.Stock
 */
export class MongoRepository {
    public readonly stockModel: typeof StockModel;

    constructor(connection: Connection) {
        this.stockModel = connection.model(StockModel.modelName);
    }
}
