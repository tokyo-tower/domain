import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as AggregateSaleRepo } from '../../repo/aggregateSale';

import * as AggregateService from '../aggregate';

/**
 * タスク実行関数
 */
export function call(data: factory.task.createPlaceOrderReport.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        if (data.transaction.result !== undefined) {
            const aggregateSaleRepo = new AggregateSaleRepo(settings.connection);
            await AggregateService.report4sales.createPlaceOrderReport({ order: data.transaction.result.order })(aggregateSaleRepo);
        }
    };
}
