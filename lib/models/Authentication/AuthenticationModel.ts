import * as mongoose from 'mongoose';
import { model as PreCustomer } from '../PreCustomer/PreCustomerModel';
import { model as Sponsor } from '../Sponsor/SponsorModel';
import { model as Staff } from '../Staff/StaffModel';
import { model as TelStaff } from '../TelStaff/TelStaffModel';
import { model as Window } from '../Window/WindowModel';

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

export const model = mongoose.model('Authentication', schema);
