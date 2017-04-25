"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const ticketTypeGroup_1 = require("./ticketTypeGroup");
/**
 * 作品スキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    name: {
        type: {
            ja: String,
            en: String
        },
        required: true
    },
    description: {
        ja: String,
        en: String
    },
    notes: {
        ja: String,
        en: String
    },
    sections: [
        {
            _id: false,
            code: String,
            name: {
                ja: String,
                en: String
            }
        }
    ],
    ticket_type_group: {
        type: String,
        ref: ticketTypeGroup_1.default.modelName,
        required: true
    },
    minutes: Number,
    is_mx4d: Boolean,
    copyright: String // コピーライト
}, {
    collection: 'films',
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
exports.default = mongoose.model('Film', schema);
