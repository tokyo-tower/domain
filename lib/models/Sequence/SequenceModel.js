"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
/**
 * 採番スキーマ
 */
const schema = new mongoose.Schema({
    no: Number,
    target: String
}, {
    collection: 'sequences'
});
exports.model = mongoose.model('Sequence', schema);
