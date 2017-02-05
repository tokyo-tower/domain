import mongoose = require('mongoose');

/**
 * 予約完了メール送信キュースキーマ
 */
let Schema = new mongoose.Schema({
    payment_no: { // 購入番号
        type: String,
        required: true
    },
    template: { // メールテンプレートコード
        type: String,
        required: true
    },
    status: { // 送信ステータス(UNSENT|SENDING|SENT)
        type: String,
        required: true
    }
},{
    collection: 'reservation_email_cues',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

Schema.index(
    {
        payment_no: 1,
        status: 1
    }
);

export default Schema;