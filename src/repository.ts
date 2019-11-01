// tslint:disable:max-classes-per-file
/**
 * リポジトリ
 */
import * as cinerino from '@cinerino/domain';

import { MongoRepository as AggregateSaleRepo } from './repo/aggregateSale';
import { RedisRepository as EventWithAggregationRepo } from './repo/event';
import { MongoRepository as PerformanceRepo } from './repo/performance';
import { RedisRepository as CheckinGateRepo } from './repo/place/checkinGate';
import { MongoRepository as ReservationRepo } from './repo/reservation';

/**
 * 売上集計リポジトリ
 */
export class AggregateSale extends AggregateSaleRepo { }

/**
 * 集計データ付きイベントリポジトリ
 */
export class EventWithAggregation extends EventWithAggregationRepo { }

export import rateLimit = cinerino.repository.rateLimit;

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
 * 会員リポジトリ
 */
export class Person extends cinerino.repository.Person { }
/**
 * プロジェクトリポジトリ
 */
export class Project extends cinerino.repository.Project { }
/**
 * 予約リポジトリ
 */
export class Reservation extends ReservationRepo { }
/**
 * タスクリポジトリ
 */
export class Task extends cinerino.repository.Task { }
/**
 * トークンリポジトリ
 */
export class Token extends cinerino.repository.Token { }
