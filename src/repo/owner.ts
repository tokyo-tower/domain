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

    /**
     * 保管する
     * @memberof repository.Owner
     * @param {factory.person.IPerson} person 人
     */
    public async save(person: factory.person.IPerson) {
        if (person.memberOf === undefined) {
            throw new factory.errors.ArgumentNull('person.memberOf');
        }

        await this.ownerModel.findOneAndUpdate(
            {
                'memberOf.username': person.memberOf.username
            },
            person,
            {
                new: true,
                upsert: true
            }
        ).exec();
    }

    /**
     * IDで取得する
     * @memberof repository.Owner
     * @param {string} id 所有者ID
     */
    public async findById(id: string): Promise<factory.person.IPerson> {
        const doc = await this.ownerModel.findById(id).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('owner');
        }

        return <factory.person.IPerson>doc.toObject();
    }
}
