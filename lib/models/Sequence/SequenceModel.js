"use strict";
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
    no: Number,
    target: String
}, {
    collection: 'sequences'
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mongoose.model('Sequence', schema);
