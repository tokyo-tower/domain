/**
 * ノーマルシート
 */
export declare const SEAT_GRADE_CODE_NORMAL = "00";
/**
 * プレミアボックスシート
 */
export declare const SEAT_GRADE_CODE_PREMIERE_BOX = "01";
/**
 * プレミアラグジュアリーシート
 */
export declare const SEAT_GRADE_CODE_PREMIERE_LUXURY = "02";
/**
 * フロントリクライニングシート
 */
export declare const SEAT_GRADE_CODE_FRONT_RECLINING = "03";
/**
 * 座席コードのソート関数
 *
 * @method
 * @param {string} a 座席コード
 * @param {string} b 座席コード
 */
export declare function sortBySeatCode(a: string, b: string): number;
