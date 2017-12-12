/**
 * パフォーマンスファクトリー
 * @namespace factory.performance
 */

/**
 * tttsExtensionPerformance.ts
 * ttts拡張・パフォーマンス情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
export interface IExtension {
    // ツアーナンバー
    // 例）10:00の枠:「101」など
    tour_number?: string;
    // エレベータ運行ステータス
    ev_service_status?: string;
    // エレベータ運行ステータス変更者
    ev_service_update_user?: string;
    // エレベータ運行ステータス更新日時
    ev_service_update_at?: string;
    // オンライン販売ステータス
    online_sales_status?: string;
    // オンライン販売ステータス変更者
    online_sales_update_user?: string;
    // オンライン販売ステータス更新日時
    online_sales_update_at?: string;
    // 返金ステータス
    refund_status?: string;
    // 一括返金ステータス変更者
    refund_update_user?: string;
    // 一括返金ステータス更新日時
    refund_update_at?: string;
    // 一括返金済数
    refunded_count?: number;
}

export interface ISeat {
    code: string; // 座席コード
    grade: {
        code: string;
        name: {
            en: string;
            ja: string;
        };
        additional_charge: number; // 追加料金
    };
}

export interface IScreen {
    code: string;
    name: {
        en: string;
        ja: string;
    };
    seats: ISeat[];
}

export interface IPerformanceWithDetails {
    _id: string;
    day: string;
    open_time: string;
    start_time: string;
    end_time: string;
    start_str: {
        en: string;
        ja: string;
    };
    location_str: {
        en: string;
        ja: string;
    };
    canceled: boolean;
    ticket_type_group: string;
    theater: {
        _id: string;
        name: {
            en: string;
            ja: string;
        };
        address: {
            en: string;
            ja: string;
        };
    };
    screen: {
        _id: string;
        name: {
            en: string;
            ja: string;
        };
        sections: IScreen[]
    };
    film: {
        _id: string;
        name: {
            en: string;
            ja: string;
        };
        // image: `${req.protocol}://${req.hostname}/images/film/${performance.get('film').get('_id')}.jpg`,
        is_mx4d: boolean;
        copyright: string;
    };
    ttts_extension: IExtension;
}
