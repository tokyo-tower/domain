import * as mongoose from 'mongoose';

/**
 * メルマガ会員スキーマ
 */
const schema = new mongoose.Schema(
    {
        user_id: String,
        password_salt: String,
        password_hash: String
    },
    {
        collection: 'members',
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

export default mongoose.model('Member', schema);
