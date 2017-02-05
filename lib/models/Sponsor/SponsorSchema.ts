import mongoose = require('mongoose');

/**
 * 外部関係者スキーマ
 */
let Schema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true
    },
    password_salt: String,
    password_hash: String,
    name: String,
    email: String,
    performance: { // パフォーマンス指定
        type: String,
        ref: 'Performance'
    },
    max_reservation_count: Number
},{
    collection: 'sponsors',
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