"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
/**
 * メルマガ会員スキーマ
 */
const schema = new mongoose.Schema({
    user_id: String,
    password_salt: String,
    password_hash: String
}, {
    collection: 'members',
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
exports.default = mongoose.model('Member', schema);
