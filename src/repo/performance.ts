import { Connection } from 'mongoose';

import * as factory from '../factory';
import PerformanceModel from './mongoose/model/performance';

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
