/**
 * パフォーマンス情報
 *
 * @class
 */
export declare class PerformanceStatuses {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     */
    getStatus(this: any, id: string): string;
    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    setStatus(this: any, id: string, status: string): void;
}
/**
 * パフォーマンス情報を新規作成する
 *
 * @memberOf PerformanceStatusesModel
 */
export declare function create(): PerformanceStatuses;
/**
 * ストレージに保管する
 *
 * @memberOf PerformanceStatusesModel
 */
export declare function store(performanceStatuses: PerformanceStatuses, cb: (err: Error | void) => void): void;
/**
 * ストレージから検索する
 *
 * @memberOf PerformanceStatusesModel
 */
export declare function find(cb: (err: Error | undefined, performanceStatuses: PerformanceStatuses | undefined) => void): void;
