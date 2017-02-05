import mongoose = require('mongoose');

/**
 * 劇場スキーマ
 */
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
},{
    collection: 'theaters',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;