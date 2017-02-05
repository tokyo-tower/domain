"use strict";
const mongoose = require("mongoose");
let Schema = new mongoose.Schema({
    shop_id: String,
    order_id: String,
    status: String,
    job_cd: String,
    amount: String,
    pay_type: String,
    tax: String,
    access_id: String,
    forward: String,
    method: String,
    approve: String,
    tran_id: String,
    tran_date: String,
    cvs_code: String,
    cvs_conf_no: String,
    cvs_receipt_no: String,
    payment_term: String,
    process_status: {
        type: String,
        required: true
    }
}, {
    collection: 'gmo_notifications',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
