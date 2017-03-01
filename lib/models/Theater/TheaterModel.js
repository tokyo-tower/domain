"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
/**
 * 劇場スキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    name: {
        ja: String,
        en: String
    },
    address: {
        ja: String,
        en: String
    }
}, {
    collection: 'theaters',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
exports.model = mongoose.model('Theater', schema);
