"use strict";
const mongoose = require("mongoose");
let Schema = new mongoose.Schema({
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
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
