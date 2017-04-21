"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const performance_1 = require("./performance");
/**
 * 外部関係者スキーマ
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
    performance: {
        type: String,
        ref: performance_1.default.modelName
    },
    max_reservation_count: Number
}, {
    collection: 'sponsors',
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
schema.index({
    user_id: 1
}, {
    unique: true
});
exports.default = mongoose.model('Sponsor', schema);
