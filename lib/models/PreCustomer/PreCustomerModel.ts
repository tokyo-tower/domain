import * as mongoose from 'mongoose';

/**
 * 1.5次販売ユーザースキーマ
 */
const schema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            unique: true
        },
        password_salt: String,
        password_hash: String,
        max_reservation_count: Number
    },
    {
        collection: 'pre_customers',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
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

export const model = mongoose.model('PreCustomer', schema);
