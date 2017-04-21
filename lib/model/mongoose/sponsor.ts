import * as mongoose from 'mongoose';
import Performance from './performance';

/**
 * 外部関係者スキーマ
 */
const schema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            unique: true
        },
        password_salt: String,
        password_hash: String,
        name: String,
        email: String,
        performance: { // パフォーマンス指定
            type: String,
            ref: Performance.modelName
        },
        max_reservation_count: Number
    },
    {
        collection: 'sponsors',
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

export default mongoose.model('Sponsor', schema);
