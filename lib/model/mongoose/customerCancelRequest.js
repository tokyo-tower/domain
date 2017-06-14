"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const CommonUtil = require("../../util/common");
const multilingualString_1 = require("./schemaTypes/multilingualString");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * 一般キャンセルリクエストスキーマ
 */
const schema = new mongoose.Schema({
    reservation: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    tickets: {
        type: [{
                _id: false,
                seat_code: String,
                seat_grade_name: multilingualString_1.default,
                seat_grade_additional_charge: Number,
                ticket_type: String,
                ticket_type_name: multilingualString_1.default,
                ticket_type_charge: Number,
                charge: Number
            }],
        default: []
    },
    cancel_name: {
        type: String,
        required: true
    }
}, {
    collection: 'customer_cancel_requests',
    id: true,
    read: 'primaryPreferred',
    safe: safe,
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    toJSON: { getters: true },
    toObject: { getters: true }
});
// tslint:disable-next-line:no-function-expression
schema.statics.methods.getTickets = function (reservaions) {
    const tickets = [];
    // チケット情報キーセット
    const copyKeys = [
        'seat_code',
        'seat_grade_name',
        'seat_grade_additional_charge',
        'ticket_type',
        'ticket_type_name',
        'ticket_type_charge',
        'charge'
    ];
    reservaions.map((reservaion) => {
        // 指定キーのみチケット情報としてコピー
        tickets.push(CommonUtil.parseFromKeys(reservaion, copyKeys));
    });
    return tickets;
};
exports.default = mongoose.model('CustomerCancelRequest', schema);
