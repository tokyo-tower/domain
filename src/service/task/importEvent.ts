import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as PerformanceRepo } from '../../repo/performance';
import { MongoRepository as TaskRepo } from '../../repo/task';

import * as PerformanceService from '../performance';

/**
 * タスク実行関数
 */
export function call(data: any): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await PerformanceService.importFromCinerino(data)({
            performance: new PerformanceRepo(settings.connection),
            task: new TaskRepo(settings.connection)
        });
    };
}
