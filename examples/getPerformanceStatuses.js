"use strict";
const ttts_domain_1 = require("../lib/ttts-domain");
ttts_domain_1.PerformanceStatusesModel.find((err, performanceStatuses) => {
    console.log(err, performanceStatuses);
});
