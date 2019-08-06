import { Connection, Model } from 'mongoose';

import * as factory from '@tokyotower/factory';
import ActionModel from './mongoose/model/action';

export type IAction<T extends factory.actionType> =
    T extends factory.actionType.OrderAction ? factory.cinerino.action.trade.order.IAction :
    T extends factory.actionType.AuthorizeAction
    ? factory.cinerino.action.authorize.IAction<factory.cinerino.action.authorize.IAttributes<any, any>> :
    factory.cinerino.action.IAction<factory.cinerino.action.IAttributes<T, any, any>>;

/**
 * アクションリポジトリ
 */
export class MongoRepository {
    public readonly actionModel: typeof Model;

    constructor(connection: Connection) {
        this.actionModel = connection.model(ActionModel.modelName);
    }

    /**
     * アクション開始
     */
    public async start<T extends factory.actionType>(attributes: factory.cinerino.action.IAttributes<T, any, any>): Promise<IAction<T>> {
        return this.actionModel.create({
            ...attributes,
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            startDate: new Date()
        })
            .then((doc) => doc.toObject());
    }

    /**
     * アクション完了
     */
    public async complete<T extends factory.actionType>(params: {
        typeOf: T;
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

    /**
     * アクション取消
     */
    public async cancel<T extends factory.actionType>(params: {
        typeOf: T;
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

    /**
     * アクション失敗
     */
    public async giveUp<T extends factory.actionType>(params: {
        typeOf: T;
        id: string;
        error: any;
    }): Promise<IAction<T>> {
        const doc = await this.actionModel.findOneAndUpdate(
            {
                typeOf: params.typeOf,
                _id: params.id
            },
            {
                actionStatus: factory.actionStatusType.FailedActionStatus,
                error: params.error,
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

    /**
     * 特定アクション検索
     */
    public async findById<T extends factory.actionType>(params: {
        typeOf: T;
        id: string;
    }): Promise<IAction<T>> {
        const doc = await this.actionModel.findOne(
            {
                typeOf: params.typeOf,
                _id: params.id
            }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.actionModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * アクション目的から検索する
     * 取引に対するアクション検索時などに使用
     */
    public async searchByPurpose<T extends factory.actionType>(params: {
        typeOf?: T;
        purpose: {
            typeOf: factory.transactionType;
            id?: string;
        };
        sort?: factory.cinerino.action.ISortOrder;
    }): Promise<IAction<T>[]> {
        const conditions: any = {
            'purpose.typeOf': {
                $exists: true,
                $eq: params.purpose.typeOf
            }
        };

        if (params.typeOf !== undefined) {
            conditions.typeOf = params.typeOf;
        }

        if (params.purpose.id !== undefined) {
            conditions['purpose.id'] = {
                $exists: true,
                $eq: params.purpose.id
            };
        }

        const query = this.actionModel.find(conditions)
            .select({ __v: 0, createdAt: 0, updatedAt: 0 });

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
