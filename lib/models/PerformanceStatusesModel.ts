import PerformanceUtil from "../models/Performance/PerformanceUtil";
import redis = require("redis");

const redisClient = redis.createClient(
    process.env.TTTS_PERFORMANCE_STATUSES_REDIS_PORT,
    process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST,
    {
        password: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_KEY,
        tls: { servername: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST },
        return_buffers: true
    }
);

const REDIS_KEY = "TTTSSeatStatusesByPerformanceId";

/**
 * パフォーマンス情報モデル
 */
export default class PerformanceStatusesModel {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     */
    public getStatus(this: any, id: string): string {
        return (this.hasOwnProperty(id)) ? this[id] : PerformanceUtil.SEAT_STATUS_A;
    }

    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    public setStatus(this: any, id: string, status: string): void {
        this[id] = status;
    }

    public save(cb: (err: Error | void) => void) {
        redisClient.setex(REDIS_KEY, 3600, JSON.stringify(this), (err: any) => {
            cb(err);
        });
    }

    public remove(cb: (err: Error | void) => any) {
        redisClient.del(REDIS_KEY, (err: any) => {
            cb(err);
        });
    }

    public static find(cb: (err: Error | undefined, performanceStatusesModel: PerformanceStatusesModel | undefined) => void): void {
        redisClient.get(REDIS_KEY, (err, reply) => {
            if (err) return cb(err, undefined);
            if (reply === null) return cb(new Error("not found."), undefined);

            let performanceStatusesModel = new PerformanceStatusesModel();

            try {
                let performanceStatusesModelInRedis = JSON.parse(reply.toString());
                for (let propertyName in performanceStatusesModelInRedis) {
                    performanceStatusesModel.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
                }
            } catch (error) {
                return cb(error, undefined);
            }

            cb(undefined, performanceStatusesModel);
        });
    }
}
