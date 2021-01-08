import { Connection, Model } from 'mongoose';

import { modelName } from '../repo/mongoose/model/reservation';

/**
 * 予約リポジトリ
 */
export class MongoRepository {
    public readonly reservationModel: typeof Model;

    constructor(connection: Connection) {
        this.reservationModel = connection.model(modelName);
    }
}
