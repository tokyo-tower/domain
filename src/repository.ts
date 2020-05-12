// tslint:disable:max-classes-per-file
/**
 * リポジトリ
 */
import { MongoRepository as AggregateSaleRepo } from './repo/aggregateSale';
import { RedisRepository as EventWithAggregationRepo } from './repo/event';
import { MongoRepository as PerformanceRepo } from './repo/performance';
import { RedisRepository as CheckinGateRepo } from './repo/place/checkinGate';
import { MongoRepository as ProjectRepo } from './repo/project';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as TaskRepo } from './repo/task';

/**
 * 売上集計リポジトリ
 */
export class AggregateSale extends AggregateSaleRepo { }

/**
 * 集計データ付きイベントリポジトリ
 */
export class EventWithAggregation extends EventWithAggregationRepo { }

export namespace place {
    /**
     * 入場場所リポジトリ
     */
    export class CheckinGate extends CheckinGateRepo { }
}

/**
 * パフォーマンスリポジトリ
 */
export class Performance extends PerformanceRepo { }
/**
 * プロジェクトリポジトリ
 */
export class Project extends ProjectRepo { }
/**
 * 予約リポジトリ
 */
export class Reservation extends ReservationRepo { }
/**
 * タスクリポジトリ
 */
export class Task extends TaskRepo { }
