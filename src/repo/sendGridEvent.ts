import { Connection } from 'mongoose';
import SendGridEventModel from './mongoose/model/sendGridEvent';

/**
 * SendGridイベントレポジトリー
 *
 * @class SendGridEventRepository
 */
export class MongoRepository {
    public readonly sendGridEventModel: typeof SendGridEventModel;

    constructor(connection: Connection) {
        this.sendGridEventModel = connection.model(SendGridEventModel.modelName);
    }
}
