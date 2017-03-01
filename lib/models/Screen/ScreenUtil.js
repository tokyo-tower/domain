/**
 * スクリーンユーティリティ
 *
 * @namespace ScreenUtil
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_RADIX = 10;
/**
 * ノーマルシート
 */
exports.SEAT_GRADE_CODE_NORMAL = '00';
/**
 * プレミアボックスシート
 */
exports.SEAT_GRADE_CODE_PREMIERE_BOX = '01';
/**
 * プレミアラグジュアリーシート
 */
exports.SEAT_GRADE_CODE_PREMIERE_LUXURY = '02';
/**
 * フロントリクライニングシート
 */
exports.SEAT_GRADE_CODE_FRONT_RECLINING = '03';
/**
 * 座席コードのソート関数
 *
 * @method
 * @param {string} a 座席コード
 * @param {string} b 座席コード
 */
function sortBySeatCode(a, b) {
    const hyphenIndexA = a.lastIndexOf('-');
    const hyphenIndexB = b.lastIndexOf('-');
    const rowA = a.substr(0, hyphenIndexA); // 行
    const rowB = b.substr(0, hyphenIndexB); // 行
    const columnA = a.substr(hyphenIndexA + 1); // 列
    const columnB = b.substr(hyphenIndexB + 1); // 列
    if (rowA < rowB) {
        return -1; // 行は文字列比較
    }
    else if (rowA > rowB) {
        return 1; // 行は文字列比較
    }
    else if (parseInt(columnA, DEFAULT_RADIX) < parseInt(columnB, DEFAULT_RADIX)) {
        return -1; // 列は数値比較
    }
    return 1;
}
exports.sortBySeatCode = sortBySeatCode;
