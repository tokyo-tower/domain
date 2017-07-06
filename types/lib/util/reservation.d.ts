/**
 * 予約可能
 */
export declare const STATUS_AVAILABLE = "AVAILABLE";
/**
 * 仮予約
 */
export declare const STATUS_TEMPORARY = "TEMPORARY";
/**
 * 主に車椅子などのための余分確保
 */
export declare const STATUS_ON_KEPT_FOR_SECURE_EXTRA = "STATUS_ON_KEPT_FOR_SECURE_EXTRA";
/**
 * TTTS確保上の仮予約
 */
export declare const STATUS_TEMPORARY_ON_KEPT_BY_TTTS = "TEMPORARY_ON_KEPT_BY_TTTS";
/**
 * 決済待ち
 */
export declare const STATUS_WAITING_SETTLEMENT = "WAITING_SETTLEMENT";
/**
 * ペイデザイン決済待ち
 */
export declare const STATUS_WAITING_SETTLEMENT_PAY_DESIGN = "WAITING_SETTLEMENT_PAY_DESIGN";
/**
 * TTTS確保
 */
export declare const STATUS_KEPT_BY_TTTS = "KEPT_BY_TTTS";
/**
 * メルマガ会員保留
 */
export declare const STATUS_KEPT_BY_MEMBER = "KEPT_BY_MEMBER";
/**
 * 予約確定
 */
export declare const STATUS_RESERVED = "RESERVED";
/**
 * キャンセル
 */
export declare const STATUS_CANCELLED = "CANCELLED";
/**
 * キャンセル料
 */
export declare const STATUS_CANCELLATION_FEE = "CANCELLATION_FEE";
/**
 * 一般
 */
export declare const PURCHASER_GROUP_CUSTOMER = "01";
/**
 * メルマガ会員先行
 */
export declare const PURCHASER_GROUP_MEMBER = "02";
/**
 * 内部関係者
 */
export declare const PURCHASER_GROUP_STAFF = "04";
/**
 * 窓口
 */
export declare const PURCHASER_GROUP_WINDOW = "06";
/**
 * MX4D追加料金
 */
export declare const CHARGE_MX4D = 1200;
/**
 * コンビニ決済手数料
 */
export declare const CHARGE_CVS = 150;
export declare const CHECK_DIGIT_WEIGHTS: number[];
export declare const SORT_TYPES_PAYMENT_NO: number[][];
/**
 * 採番対象名
 */
export declare const SEQUENCE_TARGET = "payment_no";
export declare const MAX_LENGTH_OF_SEQUENCE_NO = 7;
/**
 * 購入管理番号生成
 */
export declare function publishPaymentNo(date: string): Promise<string>;
/**
 * チェックディジットを求める
 *
 * @param {string} source
 */
export declare function getCheckDigit(source: string): number;
/**
 * チェックディジットを求める2
 *
 * @param {string} source
 */
export declare function getCheckDigit2(source: string): number;
/**
 * 購入番号の有効性をチェックする
 *
 * @param {string} paymentNo
 */
export declare function isValidPaymentNo(paymentNo: string): boolean;
/**
 * 購入番号をデコードする
 *
 * @param {string} paymentNo 購入番号
 * @returns {number} 連番
 */
export declare function decodePaymentNo(paymentNo: string): number;
/**
 * GMOオーダーIDを生成する
 *
 * @param performanceDay パフォーマンス上映日(8桁)
 * @param paymentNo 購入番号(9桁)
 * @param serialNumber 連番(2桁)
 */
export declare function createGMOOrderId(performanceDay: string, paymentNo: string, serialNumber: string): string;
/**
 * GMOオーダーIDをパースする
 *
 * @param orderId オーダーID
 */
export declare function parseGMOOrderId(orderId: string): {
    purchasedAt: string;
    performanceDay: string;
    paymentNo: string;
    serialNumber: string;
};
