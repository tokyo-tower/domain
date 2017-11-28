/**
 * パフォーマンスユーティリティ
 *
 * @namespace PerformanceUtil
 */
/**
 * 座席ステータス(◎)
 * @const SEAT_STATUS_A
 */
export declare const SEAT_STATUS_A = "◎";
/**
 * 座席ステータス(△)
 * @const SEAT_STATUS_B
 */
export declare const SEAT_STATUS_B = "△";
/**
 * 座席ステータス(×)
 * @const SEAT_STATUS_C
 */
export declare const SEAT_STATUS_C = "×";
/**
 * 座席ステータス(販売期間外)
 * @const SEAT_STATUS_G
 */
export declare const SEAT_STATUS_G = "-";
/**
 * 座席ステータス閾値(◎)
 * @const SEAT_STATUS_THRESHOLD_A
 */
export declare const SEAT_STATUS_THRESHOLD_A = 30;
/**
 * 座席ステータス閾値(△)
 * @const SEAT_STATUS_THRESHOLD_B
 */
export declare const SEAT_STATUS_THRESHOLD_B = 0;
/**
 * エレベータ運行ステータス
 * @const EV_SERVICE_STATUS
 */
export declare namespace EV_SERVICE_STATUS {
    const NORMAL = "0";
    const SLOWDOWN = "1";
    const SUSPENDED = "2";
}
/**
 * オンライン販売ステータス
 * @const ONLINE_SALES_STATUS
 */
export declare namespace ONLINE_SALES_STATUS {
    const NORMAL = "0";
    const SUSPENDED = "1";
}
/**
 * 返金ステータス
 * @const REFUND_STATUS
 */
export declare namespace REFUND_STATUS {
    const NONE = "0";
    const NOT_INSTRUCTED = "1";
    const INSTRUCTED = "2";
    const COMPLETE = "3";
}
