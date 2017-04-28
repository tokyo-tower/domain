"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const ticketType_1 = require("./ticketType");
/**
 * 券種グループスキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    name: {
        ja: String,
        en: String // 券種グループ名(英語)
    },
    ticket_types: [{
            type: String,
            ref: ticketType_1.default.modelName,
            required: true
        }]
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
