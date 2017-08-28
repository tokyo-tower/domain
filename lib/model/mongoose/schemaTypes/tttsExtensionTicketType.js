"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * tttsExtensionTicketType.ts
 * ttts拡張・チケット情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
exports.default = {
    // 種別 '0':通常 '1':車椅子
    category: {
        type: String,
        required: false
    },
    // csv出力用コード
    csv_code: {
        type: String,
        required: false
    }
};
