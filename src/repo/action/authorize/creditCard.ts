import * as factory from '@motionpicture/ttts-factory';
import { MongoRepository as AuthorizeActionRepository } from '../authorize';

/**
 * クレジットカード承認アクションレポジトリー
 */
export class MongoRepository extends AuthorizeActionRepository {
    protected readonly purpose: string = factory.action.authorize.authorizeActionPurpose.CreditCard;

    public async start(
        agent: factory.action.IParticipant,
        recipient: factory.action.IParticipant,
        object: factory.action.authorize.creditCard.IObject
    ): Promise<factory.action.authorize.creditCard.IAction> {
        const actionAttributes = factory.action.authorize.creditCard.createAttributes({
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            object: object,
            agent: agent,
            recipient: recipient,
            startDate: new Date()
        });

        return this.actionModel.create(actionAttributes).then(
            (doc) => <factory.action.authorize.creditCard.IAction>doc.toObject()
        );
    }

    public async complete(
        actionId: string,
        result: factory.action.authorize.creditCard.IResult
    ): Promise<factory.action.authorize.creditCard.IAction> {
        return this.actionModel.findByIdAndUpdate(
            actionId,
            {
                actionStatus: factory.actionStatusType.CompletedActionStatus,
                result: result,
                endDate: new Date()
            },
            { new: true }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('authorizeAction');
            }

            return <factory.action.authorize.creditCard.IAction>doc.toObject();
        });
    }

    public async cancel(
        actionId: string,
        transactionId: string
    ): Promise<factory.action.authorize.creditCard.IAction> {
        return this.actionModel.findOneAndUpdate(
            {
                _id: actionId,
                typeOf: factory.actionType.AuthorizeAction,
                'object.transactionId': transactionId,
                'purpose.typeOf': this.purpose
            },
            { actionStatus: factory.actionStatusType.CanceledActionStatus },
            { new: true }
        ).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('authorizeAction');

                }

                return <factory.action.authorize.creditCard.IAction>doc.toObject();
            });
    }
}
