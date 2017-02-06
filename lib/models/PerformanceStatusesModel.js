"use strict";
const PerformanceUtil_1 = require("../models/Performance/PerformanceUtil");
const redis = require("redis");
const redisClient = redis.createClient(process.env.TTTS_PERFORMANCE_STATUSES_REDIS_PORT, process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST, {
    password: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_KEY,
    tls: { servername: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST },
    return_buffers: true
});
const REDIS_KEY = "TTTSSeatStatusesByPerformanceId";
class PerformanceStatusesModel {
    getStatus(id) {
        return (this.hasOwnProperty(id)) ? this[id] : PerformanceUtil_1.default.SEAT_STATUS_A;
    }
    setStatus(id, status) {
        this[id] = status;
    }
    save(cb) {
        redisClient.setex(REDIS_KEY, 3600, JSON.stringify(this), (err) => {
            cb(err);
        });
    }
    remove(cb) {
        redisClient.del(REDIS_KEY, (err) => {
            cb(err);
        });
    }
    static find(cb) {
        redisClient.get(REDIS_KEY, (err, reply) => {
            if (err)
                return cb(err, undefined);
            if (reply === null)
                return cb(new Error("not found."), undefined);
            let performanceStatusesModel = new PerformanceStatusesModel();
            try {
                let performanceStatusesModelInRedis = JSON.parse(reply.toString());
                for (let propertyName in performanceStatusesModelInRedis) {
                    performanceStatusesModel.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
                }
            }
            catch (error) {
                return cb(error, undefined);
            }
            cb(undefined, performanceStatusesModel);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceStatusesModel;
