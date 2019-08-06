import * as factory from '@tokyotower/factory';
import { Connection } from 'mongoose';

import ActionModel from '../mongoose/model/action';

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

export type ObjectType = factory.paymentMethodType.CreditCard | factory.action.authorize.seatReservation.ObjectType.SeatReservation;
export type IAttributes<T extends ObjectType> =
    T extends factory.paymentMethodType.CreditCard ? factory.action.authorize.creditCard.IAttributes :
    T extends factory.action.authorize.seatReservation.ObjectType.SeatReservation ? factory.action.authorize.seatReservation.IAttributes :
    never;
export type IAction<T extends ObjectType> =
    T extends factory.paymentMethodType.CreditCard ? factory.action.authorize.creditCard.IAction :
    T extends factory.action.authorize.seatReservation.ObjectType.SeatReservation ? factory.action.authorize.seatReservation.IAction :
    never;

/**
 * 承認アクションリポジトリ
 */
export class MongoRepository {
    public readonly actionModel: typeof ActionModel;

    constructor(connection: Connection) {
        this.actionModel = connection.model(ActionModel.modelName);
    }

    public async start<T extends ObjectType>(
        attributes: IAttributes<T>
    ): Promise<IAction<T>> {
        return this.actionModel.create({
            ...attributes,
            project: project,
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            startDate: new Date()
        })
            .then((doc) => doc.toObject());
    }

    public async complete<T extends ObjectType>(params: {
        typeOf: factory.actionType.AuthorizeAction;
        id: string;
        result: any;
    }): Promise<IAction<T>> {
        const doc = await this.actionModel.findOneAndUpdate(
            {
                typeOf: params.typeOf,
                _id: params.id
            },
            {
                actionStatus: factory.actionStatusType.CompletedActionStatus,
                result: params.result,
                endDate: new Date()
            },
            { new: true }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.actionModel.modelName);
        }

        return doc.toObject();
    }

    public async cancel<T extends ObjectType>(params: {
        typeOf: factory.actionType.AuthorizeAction;
        id: string;
    }): Promise<IAction<T>> {
        const doc = await this.actionModel.findOneAndUpdate(
            {
                typeOf: params.typeOf,
                _id: params.id
            },
            { actionStatus: factory.actionStatusType.CanceledActionStatus },
            { new: true }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.actionModel.modelName);
        }

        return doc.toObject();
    }

    public async giveUp<T extends ObjectType>(
        actionId: string,
        error: any
    ): Promise<IAction<T>> {
        return this.actionModel.findByIdAndUpdate(
            actionId,
            {
                actionStatus: factory.actionStatusType.FailedActionStatus,
                error: error,
                endDate: new Date()
            },
            { new: true }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(this.actionModel.modelName);
                }

                return doc.toObject();
            });
    }

    public async findByTransactionId<T extends ObjectType>(params: {
        object: { typeOf: T };
        purpose: { id: string };
    }): Promise<IAction<T>[]> {
        return this.actionModel.find({
            typeOf: factory.actionType.AuthorizeAction,
            'object.typeOf': {
                $exists: true,
                $eq: params.object.typeOf
            },
            'purpose.typeOf': {
                $exists: true,
                $eq: factory.transactionType.PlaceOrder
            },
            'purpose.id': {
                $exists: true,
                $eq: params.purpose.id
            }
        })
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
