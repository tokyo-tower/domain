import * as createDebug from 'debug';
import { Connection } from 'mongoose';
import * as redis from 'redis';

import * as factory from '@motionpicture/ttts-factory';
import PerformanceModel from './mongoose/model/performance';

const debug = createDebug('ttts-domain:repository:performance');

/**
 * performance repository
 * @class
 */
export class MongoRepository {
    public readonly performanceModel: typeof PerformanceModel;

    constructor(connection: Connection) {
        this.performanceModel = connection.model(PerformanceModel.modelName);
    }

    public async findById(id: string): Promise<factory.performance.IPerformanceWithDetails> {
        const doc = await this.performanceModel.findById(id)
            .populate('film screen theater')
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .exec();

        if (doc === null) {
            throw new factory.errors.NotFound('performance');
        }

        return <factory.performance.IPerformanceWithDetails>doc.toObject();
    }

    /**
     * まだなければ保管する
     * @param {factory.performance.IPerformance} performance
     */
    public async saveIfNotExists(performance: factory.performance.IPerformance) {
        await this.performanceModel.findByIdAndUpdate(
            performance.id,
            {
                $setOnInsert: performance
            },
            {
                upsert: true,
                new: true
            }
        ).exec();
    }
}

/**
 * Redis Cacheリポジトリー
 * @class
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'performancesWithAggregation';

    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 集計データつきパフォーマンス情報を保管する
     * @param {factory.performance.IPerformanceWithAggregation} performance
     */
    public async store(performances: factory.performance.IPerformanceWithAggregation[], ttl: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            debug('storing performancesWithAggregation...');
            const filedsAndValues = performances.reduce((a, b) => [...a, b.id, JSON.stringify(b)], []);
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

    /**
     * idで集計データつきパフォーマンス情報を取得する
     * @param {string} id
     */
    public async findById(id: string): Promise<factory.performance.IPerformanceWithAggregation> {
        return new Promise<factory.performance.IPerformanceWithAggregation>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hget(key, id, (err, result) => {
                debug('performance on redis found.', err);
                if (err !== null) {
                    reject(err);
                } else {
                    if (result === null) {
                        reject(new factory.errors.NotFound('performanceWithAggregation'));
                    } else {
                        resolve(JSON.parse(result));
                    }
                }
            });
        });
    }

    /**
     * 集計データつきパフォーマンス情報を全て取得する
     */
    public async findAll(): Promise<factory.performance.IPerformanceWithAggregation[]> {
        return new Promise<factory.performance.IPerformanceWithAggregation[]>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hgetall(key, (err, result) => {
                debug('performance on redis found.', err);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve((result !== null) ? Object.keys(result).map((id) => JSON.parse(result[id])) : []);
                }
            });
        });
    }
}
