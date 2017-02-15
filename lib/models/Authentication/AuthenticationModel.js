"use strict";
const mongoose = require("mongoose");
const PreCustomerModel_1 = require("../PreCustomer/PreCustomerModel");
const SponsorModel_1 = require("../Sponsor/SponsorModel");
const StaffModel_1 = require("../Staff/StaffModel");
const TelStaffModel_1 = require("../TelStaff/TelStaffModel");
const WindowModel_1 = require("../Window/WindowModel");
const schema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    mvtk_kiin_cd: String,
    sponsor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: SponsorModel_1.default.modelName
    },
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: StaffModel_1.default.modelName
    },
    tel_staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: TelStaffModel_1.default.modelName
    },
    window: {
        type: mongoose.Schema.Types.ObjectId,
        ref: WindowModel_1.default.modelName
    },
    pre_customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: PreCustomerModel_1.default.modelName
    },
    signature: String,
    locale: String
}, {
    collection: 'authentications',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mongoose.model('Authentication', schema);
