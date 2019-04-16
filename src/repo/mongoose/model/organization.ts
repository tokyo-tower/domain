import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

const gmoInfoSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const parentOrganizationSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const locationSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const paymentAcceptedSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const hasPOSSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const areaServedSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const makesOfferSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 組織スキーマ
 * @ignore
 */
const schema = new mongoose.Schema(
    {
        typeOf: {
            type: String,
            required: true
        },
        identifier: String,
        name: multilingualString,
        legalName: multilingualString,
        sameAs: String,
        url: String,
        parentOrganization: parentOrganizationSchema,
        telephone: String,
        location: locationSchema,
        branchCode: String,
        paymentAccepted: [paymentAcceptedSchema],
        hasPOS: [hasPOSSchema],
        areaServed: [areaServedSchema],
        makesOffer: [makesOfferSchema],
        additionalProperty: [mongoose.SchemaTypes.Mixed],
        gmoInfo: gmoInfoSchema
    },
    {
        collection: 'organizations',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: true,
        useNestedStrict: true,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

schema.index(
    { createdAt: 1 },
    { name: 'searchByCreatedAt' }
);
schema.index(
    { updatedAt: 1 },
    { name: 'searchByUpdatedAt' }
);

schema.index(
    { typeOf: 1 },
    {
        name: 'searchByType'
    }
);
schema.index(
    { name: 1 },
    {
        name: 'searchByName',
        partialFilterExpression: {
            name: { $exists: true }
        }
    }
);
schema.index(
    { 'location.typeOf': 1 },
    {
        name: 'searchByLocationType',
        partialFilterExpression: {
            'location.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'location.branchCode': 1 },
    {
        name: 'searchByLocationBranchCode',
        partialFilterExpression: {
            'location.branchCode': { $exists: true }
        }
    }
);
schema.index(
    { 'location.name': 1 },
    {
        name: 'searchByLocationName',
        partialFilterExpression: {
            'location.name': { $exists: true }
        }
    }
);

export default mongoose.model('Organization', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });
