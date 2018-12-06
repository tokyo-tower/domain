import * as mongoose from 'mongoose';

import Performance from './performance';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 在庫スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
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
        },
        holder: {
            type: String
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

schema.index(
    {
        availability: 1
    }
);

// パフォーマンスの在庫引き当て
schema.index(
    {
        availability: 1,
        performance: 1
    }
);

export default mongoose.model('Stock', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });
