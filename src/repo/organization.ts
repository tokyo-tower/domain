import { Connection } from 'mongoose';

import * as factory from '@motionpicture/ttts-factory';
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

    public async findCorporationById(id: string): Promise<factory.organization.corporation.IOrganization> {
        const doc = await this.organizationModel.findOne({
            _id: id,
            typeOf: factory.organizationType.Corporation
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('Organization');
        }

        return <factory.organization.corporation.IOrganization>doc.toObject();

    }

    public async countCorporations(_: any): Promise<number> {
        const conditions: any[] = [{ typeOf: factory.organizationType.Corporation }];

        return this.organizationModel.count(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async searchCorporations(
        params: any
    ): Promise<factory.organization.corporation.IOrganization[]> {
        const conditions: any[] = [{ typeOf: factory.organizationType.Corporation }];
        const query = this.organizationModel.find(
            { $and: conditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0,
                // GMOのセキュアな情報を公開しないように注意
                'paymentAccepted.gmoInfo.shopPass': 0
            }
        );
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit).skip(params.limit * (params.page - 1));
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 }).exec().then((docs) => docs.map((doc) => doc.toObject()));
    }
}
