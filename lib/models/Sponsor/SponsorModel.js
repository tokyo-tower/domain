"use strict";
const mongoose = require("mongoose");
const PerformanceModel_1 = require("../Performance/PerformanceModel");
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
        ref: PerformanceModel_1.default.modelName
    },
    max_reservation_count: Number
}, {
    collection: 'sponsors',
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
exports.default = mongoose.model('Sponsor', schema);
