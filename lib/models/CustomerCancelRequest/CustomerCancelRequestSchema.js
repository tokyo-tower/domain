"use strict";
const mongoose = require("mongoose");
let Schema = new mongoose.Schema({
    payment_no: {
        type: String,
        required: true
    },
    payment_method: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    tel: {
        type: String,
        required: true
    }
}, {
    collection: 'customer_cancel_requests',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
