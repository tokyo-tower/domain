import * as createDebug from 'debug';
import { Connection } from 'mongoose';
import * as redis from 'redis';

import * as factory from '@motionpicture/ttts-factory';
import PerformanceModel from './mongoose/model/performance';

const debug = createDebug('ttts-domain:repository');

/**
 * イベントリポジトリ
 */
export class MongoRepository {
    public readonly performanceModel: typeof PerformanceModel;

    constructor(connection: Connection) {
        this.performanceModel = connection.model(PerformanceModel.modelName);
    }

    public async findById(id: string): Promise<factory.performance.IPerformanceWithDetails> {
        const doc = await this.performanceModel.findById(id)
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
        const update: any = {
            film: performance.film,
            theater: performance.theater,
            screen: performance.screen,
            ticket_type_group: performance.ticket_type_group
        };

        const setOnInsert = performance;
        delete setOnInsert.film;
        delete setOnInsert.theater;
        delete setOnInsert.screen;
        delete setOnInsert.ticket_type_group;

        await this.performanceModel.findByIdAndUpdate(
            performance.id,
            {
                $setOnInsert: setOnInsert,
                $set: update
            },
            {
                upsert: true,
                new: true
            }
        ).exec();
    }
}

/**
 * 一時イベントリポジトリ
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
