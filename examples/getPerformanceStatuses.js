"use strict";
/**
 * パフォーマンス空席状況を取得するスクリプトの例
 *
 * @ignore
 */
const ttts_domain_1 = require("../lib/ttts-domain");
ttts_domain_1.PerformanceStatusesModel.find((err, performanceStatuses) => {
    // tslint:disable-next-line:no-console
    console.log(err, performanceStatuses);
});
