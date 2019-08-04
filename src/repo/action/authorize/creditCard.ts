import * as factory from '@tokyotower/factory';
import { MongoRepository as AuthorizeActionRepository } from '../authorize';

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

/**
 * クレジットカード承認アクションレポジトリー
 */
export class MongoRepository extends AuthorizeActionRepository {
    protected readonly purpose: string = factory.action.authorize.authorizeActionPurpose.CreditCard;

    public async start(
        agent: factory.action.IParticipant,
        recipient: factory.action.IParticipant,
        object: factory.action.authorize.creditCard.IObject,
        purpose: factory.action.authorize.creditCard.IPurpose
    ): Promise<factory.action.authorize.creditCard.IAction> {
        const actionAttributes: factory.action.authorize.creditCard.IAttributes = {
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            typeOf: factory.actionType.AuthorizeAction,
            purpose: purpose,
            object: object,
            agent: agent,
            recipient: recipient,
            startDate: new Date()
        };

        return this.actionModel.create({ ...actionAttributes, project: project })
            .then((doc) => <factory.action.authorize.creditCard.IAction>doc.toObject());
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
                'object.typeOf': {
                    $exists: true,
                    $eq: factory.paymentMethodType.CreditCard
                },
                'purpose.typeOf': {
                    $exists: true,
                    $eq: factory.transactionType.PlaceOrder
                },
                'purpose.id': {
                    $exists: true,
                    $eq: transactionId
                }
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

    public async findByTransactionId(transactionId: string): Promise<factory.action.authorize.creditCard.IAction[]> {
        return this.actionModel.find({
            typeOf: factory.actionType.AuthorizeAction,
            'object.typeOf': {
                $exists: true,
                $eq: factory.paymentMethodType.CreditCard
            },
            'purpose.typeOf': {
                $exists: true,
                $eq: factory.transactionType.PlaceOrder
            },
            'purpose.id': {
                $exists: true,
                $eq: transactionId
            }
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
    }
}
