"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * tttsExtensionReservation.ts
 * ttts拡張予予約情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
exports.default = {
    // 本体の座席番号 (余分確保チケットと予約本体のチケットを結びつけるためのフィールド)
    seat_code_base: {
        type: String,
        required: true
    }
};
