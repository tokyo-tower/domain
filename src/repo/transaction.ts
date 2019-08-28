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
}
