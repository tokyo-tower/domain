import * as mongoose from 'mongoose';
import PreCustomer from './preCustomer';
import Sponsor from './sponsor';
import Staff from './staff';
import TelStaff from './telStaff';
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
        mvtk_kiin_cd: String,
        sponsor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Sponsor.modelName
        },
        staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Staff.modelName
        },
        tel_staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: TelStaff.modelName
        },
        window: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Window.modelName
        },
        pre_customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: PreCustomer.modelName
        },
        signature: String, // 署名
        locale: String // 使用言語
    },
    {
        collection: 'authentications',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

export default mongoose.model('Authentication', schema);
