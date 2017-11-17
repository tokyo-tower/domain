"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * tttsExtensionPerformance.ts
 * ttts拡張・パフォーマンス情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
exports.default = {
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
    // オンライン販売ステータス
    online_sales_status: {
        type: String,
        required: false
    }
};
