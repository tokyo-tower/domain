import * as cinerino from '@cinerino/domain';

import * as factory from '@tokyotower/factory';

/**
 * 取引リポジトリ
 */
export class MongoRepository extends cinerino.repository.Transaction {
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
     * 注文取引を確定する
     */
    public async confirmPlaceOrder(
        transactionId: string,
        endDate: Date,
        paymentMethod: factory.paymentMethodType,
        authorizeActions: factory.transaction.placeOrder.IAuthorizeAction[],
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
}
