import * as createDebug from 'debug';
import { Connection } from 'mongoose';
import * as redis from 'redis';

import * as factory from '@motionpicture/ttts-factory';

import PerformanceModel from './mongoose/model/performance';

const debug = createDebug('ttts-domain:repository');

export type ISearchConditions = factory.performance.ISearchConditions;

/**
 * イベントリポジトリ
 */
export class MongoRepository {
    private readonly performanceModel: typeof PerformanceModel;

    constructor(connection: Connection) {
        this.performanceModel = connection.model(PerformanceModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: ISearchConditions) {
        const andConditions: any[] = [];

        if (params.canceled !== undefined) {
            andConditions.push({ canceled: params.canceled });
        }

        if (Array.isArray(params.days)) {
            andConditions.push({ day: { $in: params.days } });
        }

        if (params.day !== undefined) {
            andConditions.push({ day: params.day });
        }

        if (Array.isArray(params.startTimes)) {
            andConditions.push({ start_time: { $in: params.startTimes } });
        }

        if (params.performanceId !== undefined) {
            andConditions.push({ _id: params.performanceId });
        }

        // 開始日時条件
        if (params.startFrom !== undefined) {
            andConditions.push({
                start_date: { $gte: params.startFrom }
            });
        }
        if (params.startThrough !== undefined) {
            andConditions.push({
                start_date: { $lt: params.startThrough }
            });
        }

        if (params.ttts_extension !== undefined) {
            if (params.ttts_extension.online_sales_status !== undefined) {
                andConditions.push({ 'ttts_extension.online_sales_status': params.ttts_extension.online_sales_status });
            }

            if (params.ttts_extension.online_sales_update_at !== undefined) {
                andConditions.push({ 'ttts_extension.online_sales_update_at': params.ttts_extension.online_sales_update_at });
            }

            if (params.ttts_extension.refund_status !== undefined) {
                andConditions.push({ 'ttts_extension.refund_status': params.ttts_extension.refund_status });
            }
        }

        return andConditions;
    }

    public async count(params: ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.performanceModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 予約検索
     */
    public async  search(
        params: ISearchConditions, projection?: any | null
    ): Promise<factory.performance.IPerformanceWithDetails[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        const query = this.performanceModel.find(
            (andConditions.length > 0) ? { $and: andConditions } : {},
            {
                ...(projection === undefined || projection === null) ? { __v: 0 } : undefined,
                ...projection
            }
        );

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    public async  distinct(field: string, params: ISearchConditions): Promise<any[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        const query = this.performanceModel.distinct(
            field,
            (andConditions.length > 0) ? { $and: andConditions } : {}
        );

        return query.setOptions({ maxTimeMS: 10000 })
            .exec();
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
            doorTime: performance.doorTime,
            startDate: performance.startDate,
            endDate: performance.endDate,
            duration: performance.duration,
            superEvent: performance.superEvent,
            location: performance.location,
            tourNumber: performance.tourNumber,
            film: performance.film,
            theater: performance.theater,
            screen: performance.screen,
            ticket_type_group: performance.ticket_type_group
        };

        const setOnInsert = performance;
        delete setOnInsert.doorTime;
        delete setOnInsert.startDate;
        delete setOnInsert.endDate;
        delete setOnInsert.duration;
        delete setOnInsert.superEvent;
        delete setOnInsert.location;
        delete setOnInsert.tourNumber;
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

    public async updateOne(conditions: any, update: any) {
        await this.performanceModel.findOneAndUpdate(
            conditions,
            update
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
