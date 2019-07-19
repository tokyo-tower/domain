import * as factory from '@tokyotower/factory';
import * as moment from 'moment';
import { Connection } from 'mongoose';

import TransactionModel from './mongoose/model/transaction';

/**
 * transaction repository
 */
export class MongoRepository {
    public readonly transactionModel: typeof TransactionModel;

    constructor(connection: Connection) {
        this.transactionModel = connection.model(TransactionModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.transaction.ISearchConditions<factory.transactionType>) {
        const andConditions: any[] = [
            {
                typeOf: params.typeOf
            }
        ];
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.startFrom !== undefined) {
            andConditions.push({
                startDate: { $gt: params.startFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.startThrough !== undefined) {
            andConditions.push({
                startDate: { $lt: params.startThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.endFrom !== undefined) {
            andConditions.push({
                endDate: {
                    $exists: true,
                    $gte: params.endFrom
                }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.endThrough !== undefined) {
            andConditions.push({
                endDate: {
                    $exists: true,
                    $lt: params.endThrough
                }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.ids)) {
            andConditions.push({
                _id: { $in: params.ids }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.statuses)) {
            andConditions.push({
                status: { $in: params.statuses }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.agent !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.agent.typeOf !== undefined) {
                andConditions.push({
                    'agent.typeOf': {
                        $exists: true,
                        $eq: params.agent.typeOf
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.agent.ids)) {
                andConditions.push({
                    'agent.id': {
                        $exists: true,
                        $in: params.agent.ids
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.agent.identifiers)) {
                andConditions.push({
                    'agent.identifier': {
                        $exists: true,
                        $in: params.agent.identifiers
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.agent.familyName !== undefined) {
                andConditions.push({
                    'agent.familyName': {
                        $exists: true,
                        $regex: new RegExp(params.agent.familyName, 'i')
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.agent.givenName !== undefined) {
                andConditions.push({
                    'agent.givenName': {
                        $exists: true,
                        $regex: new RegExp(params.agent.givenName, 'i')
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.agent.email !== undefined) {
                andConditions.push({
                    'agent.email': {
                        $exists: true,
                        $regex: new RegExp(params.agent.email, 'i')
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.agent.telephone !== undefined) {
                andConditions.push({
                    'agent.telephone': {
                        $exists: true,
                        $regex: new RegExp(params.agent.telephone, 'i')
                    }
                });
            }
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.tasksExportationStatuses)) {
            andConditions.push({
                tasksExportationStatus: { $in: params.tasksExportationStatuses }
            });
        }

        switch (params.typeOf) {
            case factory.transactionType.PlaceOrder:
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (params.seller !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (params.seller.typeOf !== undefined) {
                        andConditions.push({
                            'seller.typeOf': {
                                $exists: true,
                                $eq: params.seller.typeOf
                            }
                        });
                    }
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (Array.isArray(params.seller.ids)) {
                        andConditions.push({
                            'seller.id': {
                                $exists: true,
                                $in: params.seller.ids
                            }
                        });
                    }
                }

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (params.result !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (params.result.order !== undefined) {
                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (Array.isArray(params.result.order.orderNumbers)) {
                            andConditions.push({
                                'result.order.orderNumber': {
                                    $exists: true,
                                    $in: params.result.order.orderNumbers
                                }
                            });
                        }
                    }
                }
                break;
            case factory.transactionType.ReturnOrder:
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (params.object !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (params.object.order !== undefined) {
                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (Array.isArray(params.object.order.orderNumbers)) {
                            andConditions.push({
                                'object.order.orderNumber': {
                                    $exists: true,
                                    $in: params.object.order.orderNumbers
                                }
                            });
                        }
                    }
                }
                break;
            default:

        }

        return andConditions;
    }

    public async startPlaceOrder(
        transactionAttributes: factory.transaction.placeOrder.IAttributes
    ): Promise<factory.transaction.placeOrder.ITransaction> {
        return this.transactionModel.create(transactionAttributes).then(
            (doc) => <factory.transaction.placeOrder.ITransaction>doc.toObject()
        );
    }

    /**
     * find placeOrder transaction by id
     * @param transactionId transaction id
     */
    public async findPlaceOrderById(transactionId: string): Promise<factory.transaction.placeOrder.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.PlaceOrder
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return <factory.transaction.placeOrder.ITransaction>doc.toObject();
    }

    /**
     * 進行中の取引を取得する
     */
    public async findPlaceOrderInProgressById(transactionId: string): Promise<factory.transaction.placeOrder.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.PlaceOrder,
            status: factory.transactionStatusType.InProgress
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.placeOrder.ITransaction>doc.toObject();
    }

    /**
     * 取引の顧客プロフィールを更新
     */
    public async updateCustomerProfile<T extends factory.transactionType>(params: {
        typeOf: T;
        id: string;
        agent: factory.transaction.placeOrder.ICustomerContact;
    }): Promise<void> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: params.id,
                typeOf: params.typeOf,
                status: factory.transactionStatusType.InProgress
            },
            {
                'agent.email': params.agent.email,
                'agent.familyName': params.agent.familyName,
                'agent.givenName': params.agent.givenName,
                'agent.telephone': params.agent.telephone,
                'object.customerContact': params.agent // agentでの情報保持である程度運用したら削除する
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.transactionModel.modelName);
        }
    }

    /**
     * confirm a placeOrder
     * 注文取引を確定する
     * @param transactionId transaction id
     * @param endDate end date
     * @param authorizeActions authorize actions
     * @param result transaction result
     */
    public async confirmPlaceOrder(
        transactionId: string,
        endDate: Date,
        paymentMethod: factory.paymentMethodType,
        authorizeActions: factory.action.authorize.IAction[],
        result: factory.transaction.placeOrder.IResult
    ): Promise<factory.transaction.placeOrder.ITransaction> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.PlaceOrder,
                status: factory.transactionStatusType.InProgress
            },
            {
                status: factory.transactionStatusType.Confirmed, // ステータス変更
                endDate: endDate,
                'object.authorizeActions': authorizeActions, // 認可アクションリストを更新
                'object.paymentMethod': paymentMethod, // 決済方法を更新
                result: result // resultを更新
            },
            { new: true }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.placeOrder.ITransaction>doc.toObject();
    }

    /**
     * 返品取引をひとつ検索する
     */
    public async findReturnOrderById(transactionId: string): Promise<factory.transaction.returnOrder.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.ReturnOrder
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return <factory.transaction.returnOrder.ITransaction>doc.toObject();
    }

    /**
     * タスクエクスポートリトライ
     * todo updatedAtを基準にしているが、タスクエクスポートトライ日時を持たせた方が安全か？
     */
    public async reexportTasks(intervalInMinutes: number): Promise<void> {
        await this.transactionModel.findOneAndUpdate(
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting,
                updatedAt: { $lt: moment().add(-intervalInMinutes, 'minutes').toISOString() }
            },
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            }
        ).exec();
    }

    /**
     * set task status exported by transaction id
     * IDでタスクをエクスポート済に変更する
     * @param transactionId transaction id
     */
    public async setTasksExportedById(transactionId: string) {
        await this.transactionModel.findByIdAndUpdate(
            transactionId,
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Exported,
                tasksExportedAt: moment().toDate()
            }
        ).exec();
    }

    /**
     * 取引を期限切れにする
     */
    public async makeExpired(): Promise<void> {
        const endDate = moment().toDate();

        // ステータスと期限を見て更新
        await this.transactionModel.update(
            {
                status: factory.transactionStatusType.InProgress,
                expires: { $lt: endDate }
            },
            {
                status: factory.transactionStatusType.Expired,
                endDate: endDate
            },
            { multi: true }
        ).exec();
    }

    /**
     * 注文取引を検索する
     * @param conditions 検索条件
     */
    public async searchPlaceOrder(
        conditions: {
            startFrom: Date;
            startThrough: Date;
        }
    ): Promise<factory.transaction.placeOrder.ITransaction[]> {
        return this.transactionModel.find(
            {
                typeOf: factory.transactionType.PlaceOrder,
                startDate: {
                    $gte: conditions.startFrom,
                    $lte: conditions.startThrough
                }
            }
        ).exec()
            .then((docs) => docs.map((doc) => <factory.transaction.placeOrder.ITransaction>doc.toObject()));
    }

    public async count<T extends factory.transactionType>(params: factory.transaction.ISearchConditions<T>): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.transactionModel.count(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async search<T extends factory.transactionType>(
        params: factory.transaction.ISearchConditions<T>
    ): Promise<factory.transaction.ITransaction<T>[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.transactionModel.find({ $and: conditions }).select({ __v: 0, createdAt: 0, updatedAt: 0 });
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit).skip(params.limit * (params.page - 1));
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 30000 }).exec().then((docs) => docs.map((doc) => doc.toObject()));
    }
}
