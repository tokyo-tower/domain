/**
 * tttsExtensionReservation.ts
 * ttts拡張予予約情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
export default {
    // 本体の座席番号 (余分確保チケットと予約本体のチケットを結びつけるためのフィールド)
    seat_code_base: {
        type: String,
        required: true
    },
    // 一括返金ステータス
    refund_status: {
        type: String,
        required: false
    },
    // 一括返金ステータス変更者
    refund_update_user: {
        type: String,
        required: false
    },
    // 一括返金ステータス更新日時
    refund_update__at: {
        type: String,
        required: false
    }
};
