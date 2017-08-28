/**
 * ticketCancelCharge.ts
 * キャンセル料mongooseスキーマタイプ
 */
export default {
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
