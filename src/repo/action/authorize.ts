import { Connection } from 'mongoose';

import * as factory from '../../factory';
import ActionModel from '../mongoose/model/action';

/**
 * 承認アクションMongoレポジトリー
 * @export
 * @class
 */
export class MongoRepository {
    public readonly actionModel: typeof ActionModel;
    protected readonly purpose: string;

    constructor(connection: Connection) {
        this.actionModel = connection.model(ActionModel.modelName);
    }

    public async giveUp(
        actionId: string,
        error: any
    ): Promise<factory.action.authorize.IAction> {
        return this.actionModel.findByIdAndUpdate(
            actionId,
            {
                actionStatus: factory.actionStatusType.FailedActionStatus,
                error: error,
                endDate: new Date()
            },
            { new: true }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('authorizeAction');
            }

            return <factory.action.authorize.IAction>doc.toObject();
        });
    }

    /**
     * 取引内の承認アクションを取得する
     * @param transactionId 取引ID
     */
    public async findByTransactionId(transactionId: string): Promise<factory.action.authorize.IAction[]> {
        return this.actionModel.find({
            typeOf: factory.actionType.AuthorizeAction,
            'object.transactionId': transactionId,
            'purpose.typeOf': this.purpose
        }).exec().then((docs) => docs.map((doc) => <factory.action.authorize.IAction>doc.toObject()));
    }
}
