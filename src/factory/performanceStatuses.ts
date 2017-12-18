/**
 * パフォーマンス在庫状況ファクトリー
 * @namespace factory.performanceStatuses
 */

/**
 * パフォーマンス在庫状況
 * @class
 */
export class PerformanceStatuses {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     * @param {string} id パフォーマンスID
     * @returns {string} 在庫状況
     */
    public getStatus(this: any, id: string): string {
        return (this[id] !== undefined) ? this[id] : '';
    }

    /**
     * パフォーマンスIDの空席ステータスをセットする
     * @param {string} id パフォーマンスID
     */
    public setStatus(this: any, id: string, status: string): void {
        this[id] = status;
    }
}
