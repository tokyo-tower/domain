import * as redis from 'redis';
import * as PerformanceUtil from '../models/Performance/PerformanceUtil';

const redisClient = redis.createClient(
    process.env.TTTS_PERFORMANCE_STATUSES_REDIS_PORT,
    process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST,
    {
        password: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_KEY,
        tls: { servername: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST },
        return_buffers: true
    }
);

const REDIS_KEY = 'TTTSSeatStatusesByPerformanceId';
const EXPIRATION_SECONDS = 3600;

/**
 * パフォーマンス情報モデル
 *
 * @class
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
        redisClient.setex(REDIS_KEY, EXPIRATION_SECONDS, JSON.stringify(this), (err: any) => {
            cb(err);
        });
    }

    // tslint:disable-next-line:function-name
    public static find(cb: (err: Error | undefined, performanceStatusesModel: PerformanceStatusesModel | undefined) => void): void {
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
            } catch (error) {
                return cb(error, undefined);
            }

            cb(undefined, performanceStatusesModel);
        });
    }
}
