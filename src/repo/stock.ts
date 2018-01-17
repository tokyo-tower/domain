import { Connection } from 'mongoose';

import * as factory from '@motionpicture/ttts-factory';
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

    /**
     * まだなければ保管する
     * @param {factory.stock.IStock} stock
     */
    public async saveIfNotExists(stock: factory.stock.IStock) {
        await this.stockModel.findOneAndUpdate(
            {
                _id: stock.id,
                performance: stock.performance,
                seat_code: stock.seat_code
            },
            {
                // なければ作成
                $setOnInsert: stock
            },
            {
                upsert: true,
                new: true
            }
        ).exec();
    }
}
