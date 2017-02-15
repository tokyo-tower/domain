"use strict";
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true
    },
    password_salt: String,
    password_hash: String,
    max_reservation_count: Number
}, {
    collection: 'pre_customers',
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
exports.default = mongoose.model('PreCustomer', schema);
