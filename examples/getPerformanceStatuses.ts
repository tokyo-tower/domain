/**
 * パフォーマンス空席状況を取得するスクリプトの例
 *
 * @ignore
 */
import { PerformanceStatusesModel } from '../lib/index';

PerformanceStatusesModel.find((err, performanceStatuses) => {
    // tslint:disable-next-line:no-console
    console.log(err, performanceStatuses);
});
