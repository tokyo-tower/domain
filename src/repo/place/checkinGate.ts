import * as createDebug from 'debug';
import * as redis from 'redis';

import * as factory from '@motionpicture/ttts-factory';

const debug = createDebug('ttts-domain:repository');

/**
 * Redis Cacheリポジトリー
 * @class
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'checkinGates';

    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 入場場所を保管する
     */
    public async store(checkinGate: factory.place.checkinGate.IPlace): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;
            const ttl = 3600;

            this.redisClient.multi()
                .hset(key, checkinGate.identifier, JSON.stringify(checkinGate))
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
     * 入場場所を全て取得する
     */
    public async findAll(): Promise<factory.place.checkinGate.IPlace[]> {
        return new Promise<factory.place.checkinGate.IPlace[]>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hgetall(key, (err, result) => {
                debug('checkinGates on redis found.', err);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve((result !== null) ? Object.keys(result).map((identifier) => JSON.parse(result[identifier])) : []);
                }
            });
        });
    }
}
