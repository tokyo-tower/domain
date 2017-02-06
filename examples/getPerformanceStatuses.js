"use strict";
process.env.PERFORMANCE_STATUS_REDIS_PORT = 6380;
process.env.PERFORMANCE_STATUS_REDIS_HOST = "devtttsfrontendprototype.redis.cache.windows.net";
process.env.PERFORMANCE_STATUS_REDIS_KEY = "QLnxXJC0srbSaabgac+4tzlmN6abiNdkNvVco7954xc=";
const PerformanceStatusesModel_1 = require("../lib/models/PerformanceStatusesModel");
PerformanceStatusesModel_1.default.find((err, performanceStatuses) => {
    console.log(err, performanceStatuses);
});
