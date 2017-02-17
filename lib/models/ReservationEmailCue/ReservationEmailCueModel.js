"use strict";
const mongoose = require("mongoose");
/**
 * 予約完了メール送信キュースキーマ
 */
const schema = new mongoose.Schema({
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
        updatedAt: 'updated_at'
    }
});
schema.index({
    payment_no: 1,
    status: 1
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mongoose.model('ReservationEmailCue', schema);
