"use strict";
const mongoose = require("mongoose");
let Schema = new mongoose.Schema({
    payment_no: {
        type: String,
        required: true
    },
    template: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    }
}, {
    collection: 'reservation_email_cues',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Schema.index({
    payment_no: 1,
    status: 1
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
