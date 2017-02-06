export default class PerformanceStatusesModel {
    getStatus(this: any, id: string): string;
    setStatus(this: any, id: string, status: string): void;
    save(cb: (err: Error | void) => void): void;
    remove(cb: (err: Error | void) => any): void;
    static find(cb: (err: Error | undefined, performanceStatusesModel: PerformanceStatusesModel | undefined) => void): void;
}
