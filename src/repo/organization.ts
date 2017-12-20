import { Connection } from 'mongoose';

import * as factory from '../factory';
import OrganizationModel from './mongoose/model/organization';

/**
 * 組織リポジトリー
 * @class
 */
export class MongoRepository {
    public readonly organizationModel: typeof OrganizationModel;

    constructor(connection: Connection) {
        this.organizationModel = connection.model(OrganizationModel.modelName);
    }

    public async findCorporationByIdentifier(identifier: string): Promise<factory.organization.corporation.IOrganization> {
        const doc = await this.organizationModel.findOne({
            identifier: identifier,
            typeOf: factory.organizationType.Corporation
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('Organization');
        }

        return <factory.organization.corporation.IOrganization>doc.toObject();

    }
}
