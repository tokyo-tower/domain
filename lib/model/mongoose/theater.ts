import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';

/**
 * 劇場スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: multilingualString,
        description: multilingualString,
        notes: multilingualString,
        address: multilingualString
    },
    {
        collection: 'theaters',
        id: true,
        read: 'primaryPreferred',
        safe: <any>{ j: 1, w: 'majority', wtimeout: 10000 },
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    });

export default mongoose.model('Theater', schema);
