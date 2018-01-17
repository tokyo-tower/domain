import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';
import * as redis from 'redis';

const debug = createDebug('ttts-domain:repository:itemAvailability:performance');

export interface IAvailabilitiesById {
    [id: string]: string;
}

/**
 * パフォーマンス在庫状況レポジトリー
 * @class repository.itemAvailability.performance
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'performanceAvailability';

    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    public async store(performanceAvailabilities: factory.performance.IAvailability[], ttl: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            const filedsAndValues = performanceAvailabilities.reduce((a, b) => [...a, b.id, b.remainingAttendeeCapacity.toString()], []);
            debug('storing performancesWithAggregation...');
            this.redisClient.multi()
                .hmset(key, filedsAndValues)
                .expire(key, ttl)
                .exec((err, __) => {
                    debug('performancesWithAggregation stored.', err);
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    public async findById(id: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hget(key, id, (err, result) => {
                if (err !== null) {
                    reject(err);
                } else {
                    if (result === null) {
                        reject(new factory.errors.NotFound('performanceAvailability'));
                    } else {
                        // tslint:disable-next-line:no-magic-numbers
                        resolve(parseInt(result, 10));
                    }
                }
            });
        });
    }

    public async findAll(): Promise<IAvailabilitiesById> {
        return new Promise<IAvailabilitiesById>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hgetall(key, (err, result) => {
                debug('performanceAvailabilities on redis found.', err);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve((result !== null) ? result : {});
                }
            });
        });
    }
}
