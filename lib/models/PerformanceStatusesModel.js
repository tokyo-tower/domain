/**
 * パフォーマンス情報モデル
 *
 * @namespace PerformanceStatusesModel
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const PerformanceUtil = require("../models/Performance/PerformanceUtil");
const redisClient = redis.createClient(process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_PORT, process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST, {
    password: process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_KEY,
    tls: { servername: process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST },
    return_buffers: true
});
const REDIS_KEY = 'CHEVRESeatStatusesByPerformanceId';
const EXPIRATION_SECONDS = 3600;
/**
 * パフォーマンス情報
 *
 * @class
 */
class PerformanceStatuses {
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
}
exports.PerformanceStatuses = PerformanceStatuses;
/**
 * パフォーマンス情報を新規作成する
 *
 * @memberOf PerformanceStatusesModel
 */
function create() {
    return new PerformanceStatuses();
}
exports.create = create;
/**
 * ストレージに保管する
 *
 * @memberOf PerformanceStatusesModel
 */
function store(performanceStatuses, cb) {
    redisClient.setex(REDIS_KEY, EXPIRATION_SECONDS, JSON.stringify(performanceStatuses), (err) => {
        cb(err);
    });
}
exports.store = store;
/**
 * ストレージから検索する
 *
 * @memberOf PerformanceStatusesModel
 */
function find(cb) {
    redisClient.get(REDIS_KEY, (err, reply) => {
        if (err) {
            return cb(err, undefined);
        }
        if (reply === null) {
            return cb(new Error('not found.'), undefined);
        }
        const performanceStatuses = new PerformanceStatuses();
        try {
            const performanceStatusesModelInRedis = JSON.parse(reply.toString());
            Object.keys(performanceStatusesModelInRedis).forEach((propertyName) => {
                performanceStatuses.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
            });
        }
        catch (error) {
            return cb(error, undefined);
        }
        cb(undefined, performanceStatuses);
    });
}
exports.find = find;
