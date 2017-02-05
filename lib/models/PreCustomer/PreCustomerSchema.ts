import mongoose = require('mongoose');

/**
 * 1.5次販売ユーザースキーマ
 */
let Schema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true
    },
    password_salt: String,
    password_hash: String,
    max_reservation_count: Number
},{
    collection: 'pre_customers',
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