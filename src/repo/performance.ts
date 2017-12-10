import { Connection } from 'mongoose';

import * as errors from '../factory/errors';
import { IPerformanceWithDetails } from '../factory/performance';
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

    public async findById(id: string): Promise<IPerformanceWithDetails> {
        const doc = await this.performanceModel.findById(id)
            .populate('film')
            .populate('screen')
            .populate('theater')
            .exec();

        if (doc === null) {
            throw new errors.NotFound('performance');
        }

        return <IPerformanceWithDetails>doc.toObject();
    }
}
