import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/task';

/**
 * タスクリポジトリ
 */
export class MongoRepository {
    public readonly taskModel: typeof Model;

    constructor(connection: Connection) {
        this.taskModel = connection.model(modelName);
    }
}
