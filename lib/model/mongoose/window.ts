import * as mongoose from 'mongoose';

/**
 * 窓口担当者スキーマ
 */
const schema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            unique: true
        },
        password_salt: String,
        password_hash: String,
        name: String
    },
    {
        collection: 'windows',
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

schema.index(
    {
        user_id: 1
    },
    {
        unique: true
    }
);

export default mongoose.model('Window', schema);
