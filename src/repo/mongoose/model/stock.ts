import * as mongoose from 'mongoose';

import Performance from './performance';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 在庫スキーマ
 */
const schema = new mongoose.Schema(
    {
        performance: {
            type: String,
            ref: Performance.modelName,
            required: true
        },
        seat_code: {
            type: String,
            required: true
        },
        availability: {
            type: String,
            required: true
        }
    },
    {
        collection: 'stocks',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

schema.index(
    {
        performance: 1,
        seat_code: 1
    },
    {
        unique: true
    }
);

export default mongoose.model('Stock', schema);
