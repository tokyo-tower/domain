import PerformanceUtil from '../models/Performance/PerformanceUtil';
import redis = require('redis');

let redisClient = redis.createClient(
    process.env.PERFORMANCE_STATUS_REDIS_PORT,
    process.env.PERFORMANCE_STATUS_REDIS_HOST,
    {
        password: process.env.PERFORMANCE_STATUS_REDIS_KEY,
        tls: { servername: process.env.PERFORMANCE_STATUS_REDIS_HOST },
        return_buffers: true
    }
);

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
        redisClient.setex(PerformanceStatusesModel.getRedisKey(), 3600, JSON.stringify(this), (err: any) => {
            cb(err);
        });
    }

    public remove(cb: (err: Error | void) => any) {
        redisClient.del(PerformanceStatusesModel.getRedisKey(), (err: any) => {
            cb(err);
        });
    }

    public static find(cb: (err: Error | undefined, performanceStatusesModel: PerformanceStatusesModel) => any): void {
        let performanceStatusesModel = new PerformanceStatusesModel();

        redisClient.get(PerformanceStatusesModel.getRedisKey(), (err, reply) => {
            if (err) return;
            if (reply === null) return;

            try {
                let performanceStatusesModelInRedis = JSON.parse(reply.toString());
                for (let propertyName in performanceStatusesModelInRedis) {
                    performanceStatusesModel.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
                }
            } catch (error) {
            }

            cb(undefined, performanceStatusesModel);
        });
    }

    /**
     * ネームスペースを取得
     *
     * @return {string}
     */
    public static getRedisKey(): string {
        return `TTTSSeatStatusesByPerformanceId`;
    }
}
