import * as mongoose from 'mongoose';

/**
 * 内部関係者スキーマ
 */
const schema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true
    },
    password_salt: String,
    password_hash: String,
    name: String,
    email: String,
    is_admin: Boolean // 管理者かどうか
},                                 {
    collection: 'staffs',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

schema.index(
    {
        user_id: 1
    },
    {
        unique: true
    }
);

export default mongoose.model('Staff', schema);