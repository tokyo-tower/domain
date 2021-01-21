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

    public static CREATE_MONGO_CONDITIONS(params: ISearchConditions) {
        const andConditions: any[] = [];

        const projectIdEq = params.project?.id?.$eq;
        if (typeof projectIdEq === 'string') {
            andConditions.push({
                'project.id': { $exists: true, $eq: projectIdEq }
            });
        }

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
            if (params.ttts_extension.online_sales_update_at !== undefined) {
                andConditions.push({ 'ttts_extension.online_sales_update_at': params.ttts_extension.online_sales_update_at });
            }

            if (params.ttts_extension.refund_status !== undefined) {
                andConditions.push({ 'ttts_extension.refund_status': params.ttts_extension.refund_status });
            }
        }

        // イベントステータス
        const eventStatusIn = params.eventStatus?.$in;
        if (Array.isArray(eventStatusIn)) {
            andConditions.push({ eventStatus: { $in: eventStatusIn } });
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

    public async updateOne(conditions: any, update: any) {
        await this.performanceModel.findOneAndUpdate(
            conditions,
            update
        )
            .exec();
    }
}
