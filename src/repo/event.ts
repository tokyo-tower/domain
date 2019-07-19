import * as redis from 'redis';

import * as factory from '@tokyotower/factory';

export type IEvent = factory.performance.IPerformanceWithAggregation;

/**
 * 一時イベントリポジトリ
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'eventsWithAggregation';

    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 集計データつきイベント情報を保管する
     */
    public async store(performances: IEvent[], ttl: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            const filedsAndValues = performances.reduce((a, b) => [...a, b.id, JSON.stringify(b)], []);
            this.redisClient.multi()
                .hmset(key, filedsAndValues)
                .expire(key, ttl)
                .exec((err, _) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    public async findById(id: string): Promise<IEvent> {
        return new Promise<IEvent>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hget(key, id, (err, result) => {
                if (err !== null) {
                    reject(err);
                } else {
                    if (result === null) {
                        reject(new factory.errors.NotFound('EventWithAggregation'));
                    } else {
                        resolve(JSON.parse(result));
                    }
                }
            });
        });
    }

    /**
     * 集計データつきイベントを全て取得する
     */
    public async findAll(): Promise<IEvent[]> {
        return new Promise<IEvent[]>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hgetall(key, (err, result) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve((result !== null) ? Object.keys(result).map((id) => JSON.parse(result[id])) : []);
                }
            });
        });
    }

    /**
     * イベントIDからフィールドを削除する
     */
    public async deleteByIds(params: { ids: string[] }): Promise<void> {
        return new Promise((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hdel(key, params.ids, (err, _) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

}
