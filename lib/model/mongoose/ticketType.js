"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
/**
 * 券種スキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    name: {
        ja: String,
        en: String // 券種名(英語)
    },
    description: {
        ja: String,
        en: String
    },
    notes: {
        ja: String,
        en: String
    },
    charge: Number // 料金
}, {
    collection: 'ticket_types',
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
exports.default = mongoose.model('TicketType', schema);
