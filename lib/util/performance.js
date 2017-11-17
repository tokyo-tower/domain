"use strict";
/**
 * パフォーマンスユーティリティ
 *
 * @namespace PerformanceUtil
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 座席ステータス(◎)
 * @const SEAT_STATUS_A
 */
exports.SEAT_STATUS_A = '◎';
/**
 * 座席ステータス(△)
 * @const SEAT_STATUS_B
 */
exports.SEAT_STATUS_B = '△';
/**
 * 座席ステータス(×)
 * @const SEAT_STATUS_C
 */
exports.SEAT_STATUS_C = '×';
/**
 * 座席ステータス(販売期間外)
 * @const SEAT_STATUS_G
 */
exports.SEAT_STATUS_G = '-';
/**
 * 座席ステータス閾値(◎)
 * @const SEAT_STATUS_THRESHOLD_A
 */
exports.SEAT_STATUS_THRESHOLD_A = 30;
/**
 * 座席ステータス閾値(△)
 * @const SEAT_STATUS_THRESHOLD_B
 */
exports.SEAT_STATUS_THRESHOLD_B = 0;
/**
 * エレベータ運行ステータス
 * @const EV_SERVICE_STATUS
 */
var EV_SERVICE_STATUS;
(function (EV_SERVICE_STATUS) {
    // 正常運行
    EV_SERVICE_STATUS.NORMAL = '0';
    // 減速
    EV_SERVICE_STATUS.SLOWDOWN = '1';
    // 停止
    EV_SERVICE_STATUS.SUSPENDED = '2';
})(EV_SERVICE_STATUS = exports.EV_SERVICE_STATUS || (exports.EV_SERVICE_STATUS = {}));
/**
 * オンライン販売ステータス
 * @const ONLINE_SALES_STATUS
 */
var ONLINE_SALES_STATUS;
(function (ONLINE_SALES_STATUS) {
    // 販売
    ONLINE_SALES_STATUS.NORMAL = '0';
    // 停止
    ONLINE_SALES_STATUS.SUSPENDED = '1';
})(ONLINE_SALES_STATUS = exports.ONLINE_SALES_STATUS || (exports.ONLINE_SALES_STATUS = {}));
