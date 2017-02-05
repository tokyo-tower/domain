import mongoose = require('mongoose');

/**
 * 一般キャンセルリクエストスキーマ
 */
let Schema = new mongoose.Schema({
    payment_no: { // 購入番号
        type: String,
        required: true
    },
    payment_method: { // 決済方法
        type: String,
        required: true
    },
    email: { // 連絡先メールアドレス
        type: String,
        required: true
    },
    tel: { // 連絡先電話番号
        type: String,
        required: true
    }
},{
    collection: 'customer_cancel_requests',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;