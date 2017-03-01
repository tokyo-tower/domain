"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
/**
 * 窓口担当者スキーマ
 */
const schema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true
    },
    password_salt: String,
    password_hash: String,
    name: String
}, {
    collection: 'windows',
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
exports.model = mongoose.model('Window', schema);
