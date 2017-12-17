/**
 * 在庫ファクトリー
 * @namespace factory.stock
 */

import ItemAvailability from './itemAvailability';

export interface IStock {
    /**
     * 在庫ID
     * システムでグローバルユニーク
     */
    id: string;
    /**
     * パフォーマンスID
     */
    performance: string;
    /**
     * 座席コード
     */
    seat_code: string;
    /**
     * 在庫状況
     */
    availability: ItemAvailability;
    /**
     * 在庫保持者
     * 保持者がいなかればundefined
     */
    holder?: string;
}
