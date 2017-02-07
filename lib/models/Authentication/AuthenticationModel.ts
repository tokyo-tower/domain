import mongoose = require('mongoose');
import Sponsor from "../Sponsor/SponsorModel";
import Staff from "../Staff/StaffModel";
import TelStaff from "../TelStaff/TelStaffModel";
import Window from "../Window/WindowModel";
import PreCustomer from "../PreCustomer/PreCustomerModel";

/**
 * ログイン認証スキーマ
 */
let Schema = new mongoose.Schema({
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
},{
    collection: 'authentications',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default mongoose.model("Authentication", Schema);