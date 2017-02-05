"use strict";
const PerformanceUtil_1 = require("../models/Performance/PerformanceUtil");
const redis = require("redis");
let redisClient = redis.createClient(process.env.PERFORMANCE_STATUS_REDIS_PORT, process.env.PERFORMANCE_STATUS_REDIS_HOST, {
    password: process.env.PERFORMANCE_STATUS_REDIS_KEY,
    tls: { servername: process.env.PERFORMANCE_STATUS_REDIS_HOST },
    return_buffers: true
});
class PerformanceStatusesModel {
    getStatus(id) {
        return (this.hasOwnProperty(id)) ? this[id] : PerformanceUtil_1.default.SEAT_STATUS_A;
    }
    setStatus(id, status) {
        this[id] = status;
    }
    save(cb) {
        redisClient.setex(PerformanceStatusesModel.getRedisKey(), 3600, JSON.stringify(this), (err) => {
            cb(err);
        });
    }
    remove(cb) {
        redisClient.del(PerformanceStatusesModel.getRedisKey(), (err) => {
            cb(err);
        });
    }
    static find(cb) {
        let performanceStatusesModel = new PerformanceStatusesModel();
        redisClient.get(PerformanceStatusesModel.getRedisKey(), (err, reply) => {
            if (err)
                return;
            if (reply === null)
                return;
            try {
                let performanceStatusesModelInRedis = JSON.parse(reply.toString());
                for (let propertyName in performanceStatusesModelInRedis) {
                    performanceStatusesModel.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
                }
            }
            catch (error) {
            }
            cb(undefined, performanceStatusesModel);
        });
    }
    static getRedisKey() {
        return `TTTSSeatStatusesByPerformanceId`;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceStatusesModel;
