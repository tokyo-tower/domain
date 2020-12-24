import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as ReportRepo } from '../../repo/report';

import * as OrderReportService from '../report/order';

/**
 * タスク実行関数
 */
export function call(data: factory.task.createPlaceOrderReport.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const aggregateSaleRepo = new ReportRepo(settings.connection);
        await OrderReportService.createPlaceOrderReport(data)(aggregateSaleRepo);
    };
}
