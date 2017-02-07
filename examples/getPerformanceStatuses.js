"use strict";
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_PORT = 6380;
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST = "devtttsfrontendprototype.redis.cache.windows.net";
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_KEY = "QLnxXJC0srbSaabgac+4tzlmN6abiNdkNvVco7954xc=";
const index_1 = require("../index");
index_1.PerformanceStatusesModel.find((err, performanceStatuses) => {
    console.log(err, performanceStatuses);
});
