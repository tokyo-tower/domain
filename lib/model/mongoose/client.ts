import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';

/**
 * アプリケーションクライアントスキーマ
 */
const schema = new mongoose.Schema(
    {
        secret_salt: {
            type: String,
            required: true
        },
        secret_hash: {
            type: String,
            required: true
        },
        name: multilingualString,
        description: multilingualString,
        notes: multilingualString,
        email: String
    },
    {
        collection: 'clients',
        id: true,
        read: 'primaryPreferred',
        safe: <any>{ j: 1, w: 'majority', wtimeout: 10000 },
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

export default mongoose.model('Client', schema);
