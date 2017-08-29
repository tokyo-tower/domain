"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ticketCancelCharge.ts
 * キャンセル料mongooseスキーマタイプ
 */
exports.default = {
    _id: false,
    // 予約日までの日数
    days: {
        type: Number,
        required: false
    },
    // キャンセル料
    charge: {
        type: Number,
        required: false
    }
};
