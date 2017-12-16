/**
 * tttsExtensionPerformance.ts
 * ttts拡張・パフォーマンス情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
export default {
    // ツアーナンバー
    // 例）10:00の枠:「101」など
    tour_number: {
        type: String,
        required: false
    },
    // エレベータ運行ステータス
    ev_service_status: {
        type: String,
        required: false
    },
    // エレベータ運行ステータス変更者
    ev_service_update_user: {
        type: String,
        required: false
    },
    // エレベータ運行ステータス更新日時
    ev_service_update_at: {
        type: Date,
        required: false
    },
    // オンライン販売ステータス
    online_sales_status: {
        type: String,
        required: false
    },
    // オンライン販売ステータス変更者
    online_sales_update_user: {
        type: String,
        required: false
    },
    // オンライン販売ステータス更新日時
    online_sales_update_at: {
        type: Date,
        required: false
    },
    // 返金ステータス
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
    refund_update_at: {
        type: Date,
        required: false
    },
    // 一括返金済数
    refunded_count: {
        type: Number,
        required: false
    },
    // 一括返金対象数
    refund_count: {
        type: Number,
        required: false
    }
};
