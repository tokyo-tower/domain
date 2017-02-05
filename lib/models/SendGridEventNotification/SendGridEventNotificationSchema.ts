import mongoose = require('mongoose');

/**
 * SendGridイベント通知スキーマ
 */
let Schema = new mongoose.Schema({
  "payment_no": String,

  "status": String,
  "sg_event_id": String,
  "sg_message_id": String,
  "event": String,
  "email": String,
  "timestamp": Number,
  "smtp-id": String,
  "category": [String],
  "asm_group_id": Number,
  "reason": String,
  "type": String,
  "ip" : String,
  "tls" : String,
  "cert_err" : String,
  "useragent": String,
  "url": String,
  "url_offset": {
    "index": String,
    "type": String
  },
  "response": String,
  "send_at": Number
},{
    collection: 'sendgrid_event_notifications',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;