"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    payment_no: 1,
    status: 1
});
exports.default = mongoose.model('ReservationEmailCue', schema);
