/**
 * tttsExtensionTicketType.ts
 * ttts拡張・チケット情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
export default {
    // 種別 ('0':通常 '1':車椅子)
    category: {
        type: String,
        default: '0'
    },
    // 必要な座席数(通常:1 車椅子:4)
    required_seat_num: {
        type: Number,
        default: 1
    },
    // csv出力用コード
    csv_code: {
        type: String,
        required: false
    }
};
