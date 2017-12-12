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
     */
    public getStatus(this: any, id: string): string {
        return (this.id !== undefined) ? this[id] : '';
    }

    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    public setStatus(this: any, id: string, status: string): void {
        this[id] = status;
    }
}
