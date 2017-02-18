/**
 * パフォーマンス情報モデル
 *
 * @class
 */
export default class PerformanceStatusesModel {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     */
    getStatus(this: any, id: string): string;
    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    setStatus(this: any, id: string, status: string): void;
    save(cb: (err: Error | void) => void): void;
    static find(cb: (err: Error | undefined, performanceStatusesModel: PerformanceStatusesModel | undefined) => void): void;
}
