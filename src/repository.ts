// tslint:disable:max-classes-per-file
/**
 * リポジトリ
 */
import { MongoRepository as AggregateSaleRepo } from './repo/aggregateSale';
import { RedisRepository as EventWithAggregationRepo } from './repo/event';
import { MongoRepository as PerformanceRepo } from './repo/performance';
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

/**
 * パフォーマンスリポジトリ
 */
export class Performance extends PerformanceRepo { }

/**
 * 予約リポジトリ
 */
export class Reservation extends ReservationRepo { }

/**
 * タスクリポジトリ
 */
export class Task extends TaskRepo { }
