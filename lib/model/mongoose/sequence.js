"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
/**
 * 採番スキーマ
 */
const schema = new mongoose.Schema({
    target: String,
    date: String,
    no: Number // 連番
}, {
    collection: 'sequences',
    id: true,
    read: 'primaryPreferred',
    // 採番はprimaryとその他で決してデータが重複してはならないので、write concernの設定には要注意
    safe: { j: 1, w: 'majority', wtimeout: 10000 },
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    toJSON: { getters: true },
    toObject: { getters: true }
});
// 日付ごとに対象の採番が重複しないように
schema.index({
    target: 1,
    date: 1
}, {
    unique: true
});
exports.default = mongoose.model('Sequence', schema);
