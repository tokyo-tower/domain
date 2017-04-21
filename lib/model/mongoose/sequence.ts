import * as mongoose from 'mongoose';

/**
 * 採番スキーマ
 */
const schema = new mongoose.Schema(
    {
        no: Number,
        target: String
    },
    {
        collection: 'sequences',
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

export default mongoose.model('Sequence', schema);
