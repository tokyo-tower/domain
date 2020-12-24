import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as AggregateSaleRepo } from '../../repo/aggregateSale';

import * as AggregateService from '../aggregate';

/**
 * タスク実行関数
 */
export function call(data: factory.task.updateOrderReportByReservation.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const aggregateSaleRepo = new AggregateSaleRepo(settings.connection);
        await AggregateService.report4sales.updateOrderReportByReservation(data)({
            aggregateSale: aggregateSaleRepo
        });
    };
}
