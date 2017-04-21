"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const preCustomer_1 = require("./preCustomer");
const sponsor_1 = require("./sponsor");
const staff_1 = require("./staff");
const telStaff_1 = require("./telStaff");
const window_1 = require("./window");
/**
 * ログイン認証スキーマ
 */
const schema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    mvtk_kiin_cd: String,
    sponsor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: sponsor_1.default.modelName
    },
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: staff_1.default.modelName
    },
    tel_staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: telStaff_1.default.modelName
    },
    window: {
        type: mongoose.Schema.Types.ObjectId,
        ref: window_1.default.modelName
    },
    pre_customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: preCustomer_1.default.modelName
    },
    signature: String,
    locale: String // 使用言語
}, {
    collection: 'authentications',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
exports.default = mongoose.model('Authentication', schema);
