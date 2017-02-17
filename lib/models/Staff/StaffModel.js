"use strict";
const mongoose = require("mongoose");
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
}, {
    collection: 'staffs',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
schema.index({
    user_id: 1
}, {
    unique: true
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mongoose.model('Staff', schema);
