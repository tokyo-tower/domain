/**
 * パフォーマンスユーティリティ
 *
 * @namespace PerformanceUtil
 */

/**
 * 座席ステータス(◎)
 * @const SEAT_STATUS_A
 */
export const SEAT_STATUS_A = '◎';
/**
 * 座席ステータス(△)
 * @const SEAT_STATUS_B
 */
export const SEAT_STATUS_B = '△';
/**
 * 座席ステータス(×)
 * @const SEAT_STATUS_C
 */
export const SEAT_STATUS_C = '×';
/**
 * 座席ステータス(販売期間外)
 * @const SEAT_STATUS_G
 */
export const SEAT_STATUS_G = '-';

/**
 * 座席ステータス閾値(◎)
 * @const SEAT_STATUS_THRESHOLD_A
 */
export const SEAT_STATUS_THRESHOLD_A = 30;
/**
 * 座席ステータス閾値(△)
 * @const SEAT_STATUS_THRESHOLD_B
 */
export const SEAT_STATUS_THRESHOLD_B = 0;

/**
 * エレベータ運行ステータス
 * @const EV_SERVICE_STATUS
 */
export namespace EV_SERVICE_STATUS {
    // 正常運行
    export const NORMAL = '0';
    // 減速
    export const SLOWDOWN = '1';
    // 停止
    export const SUSPENDED = '2';
}
/**
 * オンライン販売ステータス
 * @const ONLINE_SALES_STATUS
 */
export namespace ONLINE_SALES_STATUS {
    // 販売
    export const NORMAL = '0';
    // 停止
    export const SUSPENDED = '1';
}
/**
 * 返金ステータス
 * @const REFUND_STATUS
 */
export namespace REFUND_STATUS {
    // なし
    export const NONE = '0';
    // 未指示
    export const NOT_INSTRUCTED = '1';
    // 指示済
    export const INSTRUCTED = '2';
    // 返金完了
    export const COMPLETE = '3';
}
