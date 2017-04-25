"use strict";
/**
 * パフォーマンス情報モデル
 *
 * @namespace PerformanceStatusesModel
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const PerformanceUtil = require("../util/performance");
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
        return (this.id !== undefined) ? this[id] : PerformanceUtil.SEAT_STATUS_A;
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
function store(performanceStatuses) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            redisClient.setex(REDIS_KEY, EXPIRATION_SECONDS, JSON.stringify(performanceStatuses), (err) => {
                return (err instanceof Error) ? reject(err) : resolve();
            });
        });
    });
}
exports.store = store;
/**
 * ストレージから検索する
 *
 * @memberOf PerformanceStatusesModel
 */
function find() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            redisClient.get(REDIS_KEY, (err, reply) => {
                if (err instanceof Error) {
                    reject(err);
                    return;
                }
                if (reply === null) {
                    reject(new Error('not found'));
                    return;
                }
                const performanceStatuses = new PerformanceStatuses();
                try {
                    const performanceStatusesModelInRedis = JSON.parse(reply.toString());
                    Object.keys(performanceStatusesModelInRedis).forEach((propertyName) => {
                        performanceStatuses.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
                    });
                }
                catch (error) {
                    reject(error);
                    return;
                }
                resolve(performanceStatuses);
            });
        });
    });
}
exports.find = find;
