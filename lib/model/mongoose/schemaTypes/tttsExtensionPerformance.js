"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * tttsExtensionPerformance.ts
 * ttts拡張・パフォーマンス情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
exports.default = {
    // ツアーナンバー
    // 例）10:00の枠:「10-A」など
    tour_number: {
        type: String,
        required: false
    }
};