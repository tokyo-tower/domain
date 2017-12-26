import { Connection } from 'mongoose';

import * as factory from '@motionpicture/ttts-factory';
import OwnerModel from './mongoose/model/owner';

/**
 * owner repository
 * @class
 */
export class MongoRepository {
    public readonly ownerModel: typeof OwnerModel;

    constructor(connection: Connection) {
        this.ownerModel = connection.model(OwnerModel.modelName);
    }

    public async findById(id: string): Promise<factory.person.IPerson> {
        const doc = await this.ownerModel.findById(id).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('owner');
        }

        return <factory.person.IPerson>doc.toObject();
    }
}
