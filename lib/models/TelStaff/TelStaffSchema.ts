import mongoose = require('mongoose');

/**
 * 電話窓口担当者スキーマ
 */
let Schema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true
    },
    password_salt: String,
    password_hash: String,
    name: String
},{
    collection: 'tel_staffs',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

Schema.index(
    {
        user_id: 1,
    },
    {
        unique: true
    }
);

export default Schema;