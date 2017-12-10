import { Connection } from 'mongoose';

import ReservationModel from '../repo/mongoose/model/reservation';

/**
 * 在庫レポジトリー
 * @class repository.Stock
 */
export class MongoRepository {
    public readonly stockModel: typeof ReservationModel;

    constructor(connection: Connection) {
        this.stockModel = connection.model(ReservationModel.modelName);
    }
}
