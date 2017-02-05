"use strict";
const mongoose = require("mongoose");
let Schema = new mongoose.Schema({
    _id: String,
    name: {
        type: {
            ja: String,
            en: String
        },
        required: true
    },
    sections: [
        {
            _id: false,
            code: String,
            name: {
                ja: String,
                en: String
            }
        },
    ],
    ticket_type_group: {
        type: String,
        ref: 'TicketTypeGroup',
        required: true
    },
    minutes: Number,
    is_mx4d: Boolean,
    copyright: String
}, {
    collection: 'films',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
