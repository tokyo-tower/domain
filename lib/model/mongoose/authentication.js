"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const staff_1 = require("./staff");
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
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: staff_1.default.modelName
    },
    window: {
        type: mongoose.Schema.Types.ObjectId,
        ref: window_1.default.modelName
    },
    signature: String,
    locale: String // 使用言語
}, {
    collection: 'authentications',
    id: true,
    read: 'primaryPreferred',
    safe: { j: 1, w: 'majority', wtimeout: 10000 },
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    toJSON: { getters: true },
    toObject: { getters: true }
});
exports.default = mongoose.model('Authentication', schema);
