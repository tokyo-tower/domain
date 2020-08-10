import { Connection } from 'mongoose';

import * as factory from '@tokyotower/factory';

import PerformanceModel from './mongoose/model/performance';

export type ISearchConditions = factory.performance.ISearchConditions;

/**
 * イベントリポジトリ
 */
export class MongoRepository {
    public readonly performanceModel: typeof PerformanceModel;

    constructor(connection: Connection) {
        this.performanceModel = connection.model(PerformanceModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: ISearchConditions) {
        const andConditions: any[] = [];

        if (Array.isArray(params.ids)) {
            andConditions.push({
                _id: { $in: params.ids }
            });
        }

        // 開始日時条件
        if (params.startFrom !== undefined) {
            andConditions.push({
                startDate: { $gte: params.startFrom }
            });
        }
        if (params.startThrough !== undefined) {
            andConditions.push({
                startDate: { $lt: params.startThrough }
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
    public async search(
        params: ISearchConditions, projection?: any | null
    ): Promise<factory.performance.IPerformance[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        const query = this.performanceModel.find(
            (andConditions.length > 0) ? { $and: andConditions } : {},
            {
                ...(projection === undefined || projection === null)
                    ? {
                        __v: 0,
                        created_at: 0,
                        updated_at: 0
                    }
                    : undefined,
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

    public async distinct(field: string, params: ISearchConditions): Promise<any[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        const query = this.performanceModel.distinct(
            field,
            (andConditions.length > 0) ? { $and: andConditions } : {}
        );

        return query.setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async findById(id: string): Promise<factory.performance.IPerformance> {
        const doc = await this.performanceModel.findById(id, {
            __v: 0,
            created_at: 0,
            updated_at: 0
        })
            .exec();

        if (doc === null) {
            throw new factory.errors.NotFound('performance');
        }

        return doc.toObject();
    }

    /**
     * まだなければ保管する
     */
    public async saveIfNotExists(performance: factory.performance.IPerformance) {
        const update: any = {
            doorTime: performance.doorTime,
            startDate: performance.startDate,
            endDate: performance.endDate,
            duration: performance.duration,
            superEvent: performance.superEvent,
            location: performance.location,
            additionalProperty: performance.additionalProperty
            // ...(performance.eventStatus !== undefined)
            //     ? { eventStatus: performance.eventStatus }
            //     : undefined
        };

        const setOnInsert = performance;
        delete setOnInsert.doorTime;
        delete setOnInsert.startDate;
        delete setOnInsert.endDate;
        delete setOnInsert.duration;
        delete setOnInsert.superEvent;
        delete setOnInsert.location;
        delete setOnInsert.additionalProperty;
        // if (setOnInsert.eventStatus !== undefined) {
        //     delete setOnInsert.eventStatus;
        // }

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
