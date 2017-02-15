"use strict";
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
    _id: String,
    name: {
        ja: String,
        en: String
    },
    types: [
        {
            _id: false,
            code: String,
            name: {
                ja: String,
                en: String
            },
            charge: Number
        }
    ]
}, {
    collection: 'ticket_type_groups',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mongoose.model('TicketTypeGroup', schema);
