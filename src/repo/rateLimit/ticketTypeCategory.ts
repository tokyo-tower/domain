import * as createDebug from 'debug';
import * as moment from 'moment';
import * as redis from 'redis';

import * as factory from '@motionpicture/ttts-factory';

const debug = createDebug('ttts-domain:repository');

/**
 * レート制限キーインターフェース
 * @interface
 */
export interface IRateLimitKey {
    ticketTypeCategory: factory.ticketTypeCategory;
    performanceStartDate: Date;
    unitInSeconds: number;
}

/**
 * 券種カテゴリーに対するレート制限レポジトリー
 * @class respoitory.rateLimit:ticketTypeCategory
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'ticketTypeCategoryRateLimit';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    public static CREATE_REDIS_KEY(ratelimitKey: IRateLimitKey) {
        const dateNow = moment(ratelimitKey.performanceStartDate);
        // tslint:disable-next-line:no-magic-numbers
        const unitInSeconds = parseInt(ratelimitKey.unitInSeconds.toString(), 10);
        const validFrom = dateNow.unix() - dateNow.unix() % unitInSeconds;

        return `${RedisRepository.KEY_PREFIX}-${validFrom.toString()}`;
    }

    /**
     * ロックする
     */
    public async lock(ratelimitKey: IRateLimitKey, holder: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const key = RedisRepository.CREATE_REDIS_KEY(ratelimitKey);
            const ttl = moment(ratelimitKey.performanceStartDate).add(ratelimitKey.unitInSeconds, 'seconds').diff(moment(), 'seconds');
            debug('locking...', key, ttl);

            this.redisClient.multi()
                .setnx(key, holder, debug)
                .expire(key, ttl, debug)
                .exec((err, results) => {
                    debug('results:', results);
                    if (err !== null) {
                        reject(err);
                    } else {
                        if (results[0] === 1) {
                            resolve();
                        } else {
                            const message = `Ticket type category '${ratelimitKey.ticketTypeCategory}' rate limit exceeded.`;
                            reject(new factory.errors.RateLimitExceeded(message));
                        }
                    }
                });
        });
    }

    /**
     * カウントをリセットするカウントアップする
     * @param {Date} now 現在日時
     * @param {number} aggregationUnitInSeconds 集計単位(秒)
     */
    public async unlock(ratelimitKey: IRateLimitKey) {
        return new Promise<void>((resolve, reject) => {
            const key = RedisRepository.CREATE_REDIS_KEY(ratelimitKey);

            this.redisClient.del(key, (err, results) => {
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
     * 保持者を取得する
     */
    public async getHolder(ratelimitKey: IRateLimitKey): Promise<string | null> {
        return new Promise<string | null>((resolve, reject) => {
            const key = RedisRepository.CREATE_REDIS_KEY(ratelimitKey);
            debug('getting', key);

            this.redisClient.get(key, (err, result) => {
                debug('result:', err, result);
                if (err !== null) {
                    reject(err);
                } else {
                    // tslint:disable-next-line:no-magic-numbers
                    resolve(result);
                }
            });
        });
    }
}
