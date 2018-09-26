// tslint:disable-next-line:missing-jsdoc
import * as createDebug from 'debug';
import * as redis from 'redis';

const debug = createDebug('ttts-domain:repository:itemAvailability:suspension');

/**
 * パフォーマンス在庫状況レポジトリー
 * 返金処理の処理実行
 * @class repository.itemAvailability.suspension
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'performanceDay';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 販売停止に対するパフォーマンス日を保管する
     */
    public async save(performanceDay: string, performanceId: string, ttl: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const key = `${RedisRepository.KEY_PREFIX}${performanceDay}`;

            debug('saving performanceDate ...', performanceDay);
            this.redisClient.multi()
                .hset(key, performanceId, performanceDay)
                .expire(key, ttl)
                .exec((err, results) => {
                    debug('results:', results);
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    /**
     * 全部パフォーマンス日を取得
     */
    public async findKeys(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const key = `${RedisRepository.KEY_PREFIX}*`;

            this.redisClient.keys(key, (err, result) => {
                debug('Keys on redis found.', err);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve((result !== null) ? result : []);
                }
            });
        });
    }

    /**
     * RedisにKeyの削除
     */
    public async deleteKey(performanceDay: string) {
        return new Promise<void>((resolve, reject) => {
            const redisKey = `${RedisRepository.KEY_PREFIX}${performanceDay}`;

            this.redisClient.del(redisKey, (err, results) => {
                debug('results:', results);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
