/**
 * パフォーマンスファクトリー
 * @namespace factory.performance
 */

import { IBilingualString, IMultilingualString } from './multilingualString';
import { ICheckin, IReservation } from './reservation/event';
import TicketTypeCategory from './ticketTypeCategory';

/**
 * エレベータ運行ステータス
 * @enum
 */
export enum EvServiceStatus {
    // 正常運行
    Normal = 'Normal',
    // 減速
    Slowdown = 'Slowdown',
    // 停止
    Suspended = 'Suspended'
}

/**
 * オンライン販売ステータス
 * @enum
 */
export enum OnlineSalesStatus {
    // 販売
    Normal = 'Normal',
    // 停止
    Suspended = 'Suspended'
}

/**
 * 返金ステータス
 * @enum
 */
export enum RefundStatus {
    // なし
    None = 'None',
    // 未指示
    NotInstructed = 'NotInstructed',
    // 指示済
    Instructed = 'Instructed',
    // 返金完了
    Compeleted = 'Compeleted'
}

/**
 * tttsExtensionPerformance.ts
 * ttts拡張・パフォーマンス情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
export interface IExtension {
    // ツアーナンバー
    // 例）10:00の枠:「101」など
    tour_number: string;
    // エレベータ運行ステータス
    ev_service_status: EvServiceStatus;
    // エレベータ運行ステータス変更者
    ev_service_update_user?: string;
    // エレベータ運行ステータス更新日時
    ev_service_update_at?: Date;
    // オンライン販売ステータス
    online_sales_status: OnlineSalesStatus;
    // オンライン販売ステータス変更者
    online_sales_update_user?: string;
    // オンライン販売ステータス更新日時
    online_sales_update_at?: Date;
    // 返金ステータス
    refund_status?: RefundStatus;
    // 一括返金ステータス変更者
    refund_update_user?: string;
    // 一括返金ステータス更新日時
    refund_update_at?: Date;
    // 返金済数
    refunded_count?: number;
    // 未返金数
    unrefunded_count?: number;
}

export interface ISeat {
    code: string; // 座席コード
    grade: {
        code: string;
        name: IBilingualString;
        additional_charge: number; // 追加料金
    };
}

export interface IScreen {
    code: string;
    name: IBilingualString;
    seats: ISeat[];
}

export interface ITicketType {
    /**
     * 券種カテゴリーごとのレート制限単位(何秒に1予約という設定)
     */
    rate_limit_unit_in_seconds: number;
    ttts_extension: { csv_code: string; required_seat_num: number; category: TicketTypeCategory; };
    cancel_charge: { charge: number; days: number; }[];
    charge: number;
    notes: string;
    description: string;
    name: IMultilingualString;
    id: string;
}

export interface ITicketTypeGroup {
    id: string;
    ticket_types: ITicketType[];
    name: IBilingualString;
}

/**
 * 詳細情報つきのパフォーマンスインターフェース
 * @interface
 * @memberof factory.performance
 */
export interface IPerformanceWithDetails {
    id: string;
    day: string;
    open_time: string;
    start_time: string;
    end_time: string;
    start_str: IBilingualString;
    location_str: IBilingualString;
    canceled: boolean;
    ticket_type_group: ITicketTypeGroup;
    theater: {
        id: string;
        name: IBilingualString;
        address: IBilingualString;
    };
    screen: {
        id: string;
        name: IBilingualString;
        sections: IScreen[]
    };
    film: {
        id: string;
        name: IBilingualString;
        // image: `${req.protocol}://${req.hostname}/images/film/${performance.get('film').get('_id')}.jpg`,
        is_mx4d: boolean;
        copyright: string;
    };
    ttts_extension: IExtension;
    door_time?: Date;
    start_date: Date;
    end_date: Date;
    duration: string;
    tour_number: string;
}

/**
 * パフォーマンスインターフェース
 * @interface
 * @memberof factory.performance
 */
export interface IPerformance {
    id: string;
    theater: string;
    theater_name: IBilingualString;
    screen: string;
    screen_name: IBilingualString;
    film: string;
    ticket_type_group: string;
    day: string;
    open_time: string;
    start_time: string;
    end_time: string;
    canceled: boolean;
    ttts_extension: IExtension;
    door_time?: Date;
    start_date: Date;
    end_date: Date;
    duration: string;
    tour_number: string;
}

export type ICheckinWithTicketType = ICheckin & {
    ticketType: string;
    ticketCategory: TicketTypeCategory;
};

export interface ICheckinCountsByTicketType {
    ticketType: string;
    ticketCategory: TicketTypeCategory;
    count: number;
}

export interface ICheckinCountByWhere {
    /**
     * 入場場所
     */
    where: string;
    /**
     * 券種ごとの入場数
     */
    checkinCountsByTicketType: ICheckinCountsByTicketType[];
}

/**
 * 集計データつきのパフォーマンスインターフェース
 * @interface
 */
export interface IPerformanceWithAggregation {
    id: string;
    startDate: Date;
    endDate: Date;
    duration: string;
    tourNumber: string;
    // エレベータ運行ステータス
    evServiceStatus: EvServiceStatus;
    // オンライン販売ステータス
    onlineSalesStatus: OnlineSalesStatus;
    /**
     * 全予約数
     */
    reservationCount: number;
    /**
     * 全入場数
     */
    checkinCount: number;
    /**
     * 券種ごとの予約数
     */
    reservationCountsByTicketType: IReservationCountByTicketType[];
    /**
     * 場所ごとの入場数
     */
    checkinCountsByWhere: ICheckinCountByWhere[];
}

export interface ICheckpoint {
    where: string;
    description: string;
}

export interface IReservedExtra {
    ticketType: string;
    reservedNum: number;
}
export interface IReservationCountByTicketType {
    ticketType: string;
    count: number;
}
export interface IReservationAggregation {
    /**
     * パフォーマンス情報
     */
    performance: IPerformanceWithDetails;
    /**
     * 予約リスト
     */
    reservations: IReservation[];
    /**
     * 券種ごとの予約数
     */
    reservationCountsByTicketType: IReservationCountByTicketType[];
}

export type IReservationAggregations = IReservationAggregation[];

/**
 * 券種ごとの入場数インターフェース
 * @interface
 */
export interface IArrivedCountByTicketType {
    ticketType: string;
    ticketCategory: TicketTypeCategory;
    count: number;
}
/**
 * 入場場所ごとの入場履歴情報
 */
export interface ICheckinInfoByWhere {
    /**
     * 入場場所
     */
    where: string;
    /**
     * 入場履歴
     */
    checkins: ICheckinWithTicketType[];
    /**
     * 券種ごとの入場数
     */
    arrivedCountsByTicketType: IArrivedCountByTicketType[];
}
export type ICheckinInfosByWhere = ICheckinInfoByWhere[];
/**
 * パフォーマンスごとの入場情報インターフェース
 * @interface
 */
export interface ICheckinInfoByPerformance {
    performanceId: string;
    /**
     * 場所ごとの入場情報
     */
    checkinInfosByWhere: ICheckinInfosByWhere;
}

/**
 * 在庫状況インターフェース
 * @interface
 * @memberof factory.performance
 */
export interface IAvailability {
    id: string;
    remainingAttendeeCapacity: number;
}
