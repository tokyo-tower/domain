"use strict";
const redis = require("redis");
const PerformanceUtil = require("../models/Performance/PerformanceUtil");
const redisClient = redis.createClient(process.env.TTTS_PERFORMANCE_STATUSES_REDIS_PORT, process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST, {
    password: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_KEY,
    tls: { servername: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST },
    return_buffers: true
});
const REDIS_KEY = 'TTTSSeatStatusesByPerformanceId';
const EXPIRATION_SECONDS = 3600;
/**
 * パフォーマンス情報モデル
 *
 * @class
 */
class PerformanceStatusesModel {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     */
    getStatus(id) {
        return (this.hasOwnProperty(id)) ? this[id] : PerformanceUtil.SEAT_STATUS_A;
    }
    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    setStatus(id, status) {
        this[id] = status;
    }
    save(cb) {
        redisClient.setex(REDIS_KEY, EXPIRATION_SECONDS, JSON.stringify(this), (err) => {
            cb(err);
        });
    }
    // tslint:disable-next-line:function-name
    static find(cb) {
        redisClient.get(REDIS_KEY, (err, reply) => {
            if (err) {
                return cb(err, undefined);
            }
            if (reply === null) {
                return cb(new Error('not found.'), undefined);
            }
            const performanceStatusesModel = new PerformanceStatusesModel();
            try {
                const performanceStatusesModelInRedis = JSON.parse(reply.toString());
                Object.keys(performanceStatusesModelInRedis).forEach((propertyName) => {
                    performanceStatusesModel.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
                });
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
