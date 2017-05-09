import * as mongoose from 'mongoose';
import Owner from './owner';
import Staff from './staff';
import Window from './window';

/**
 * ログイン認証スキーマ
 */
const schema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Owner.modelName
        },
        staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Staff.modelName
        },
        window: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Window.modelName
        },
        signature: String, // 署名
        locale: String // 使用言語
    },
    {
        collection: 'authentications',
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

export default mongoose.model('Authentication', schema);
