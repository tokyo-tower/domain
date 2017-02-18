"use strict";
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
            charge: Number // 料金
        }
    ]
}, {
    collection: 'ticket_type_groups',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
exports.model = mongoose.model('TicketTypeGroup', schema);
