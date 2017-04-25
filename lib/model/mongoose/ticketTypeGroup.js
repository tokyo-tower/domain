"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
/**
 * 券種グループスキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    name: {
        ja: String,
        en: String // 券種グループ名(英語)
    },
    types: [
        {
            _id: false,
            code: String,
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
        }
    ]
}, {
    collection: 'ticket_type_groups',
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
exports.default = mongoose.model('TicketTypeGroup', schema);
