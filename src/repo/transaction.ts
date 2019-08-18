import * as cinerino from '@cinerino/domain';

import * as factory from '@tokyotower/factory';

/**
 * 取引リポジトリ
 */
export class MongoRepository extends cinerino.repository.Transaction {
    /**
     * 取引の顧客プロフィールを更新
     */
    public async updateCustomerProfile<T extends factory.transactionType>(params: {
        typeOf: T;
        id: string;
        agent: factory.transaction.placeOrder.ICustomerProfile;
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
                ...(typeof params.agent.age === 'string') ? { 'agent.age': params.agent.age } : {},
                ...(typeof params.agent.address === 'string') ? { 'agent.address': params.agent.address } : {},
                ...(typeof params.agent.gender === 'string') ? { 'agent.gender': params.agent.gender } : {}
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
        // paymentMethod: factory.paymentMethodType,
        authorizeActions: factory.transaction.placeOrder.IAuthorizeAction[],
        result: factory.transaction.placeOrder.IResult,
        potentialActions: factory.cinerino.transaction.placeOrder.IPotentialActions
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
                // 'object.paymentMethod': paymentMethod, // 決済方法を更新
                result: result, // resultを更新
                potentialActions: potentialActions
            },
            { new: true }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.placeOrder.ITransaction>doc.toObject();
    }
}
