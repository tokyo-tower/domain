// tslint:disable:max-classes-per-file
/**
 * リポジトリ
 */
import * as cinerino from '@cinerino/domain';

import { MongoRepository as AggregateSaleRepo } from './repo/aggregateSale';
import { RedisRepository as EventWithAggregationRepo } from './repo/event';
import { RedisRepository as PaymentNoRepo } from './repo/paymentNo';
import { MongoRepository as PerformanceRepo } from './repo/performance';
import { CognitoRepository as PersonRepo } from './repo/person';
import { RedisRepository as CheckinGateRepo } from './repo/place/checkinGate';
import { MongoRepository as ReservationRepo } from './repo/reservation';

/**
 * 売上集計リポジトリ
 */
export class AggregateSale extends AggregateSaleRepo { }

/**
 * アクションリポジトリ
 */
export class Action extends cinerino.repository.Action { }

/**
 * 集計データ付きイベントリポジトリ
 */
export class EventWithAggregation extends EventWithAggregationRepo { }

/**
 * 請求書リポジトリ
 */
export class Invoice extends cinerino.repository.Invoice { }

export import rateLimit = cinerino.repository.rateLimit;

/**
 * 注文リポジトリ
 */
export class Order extends cinerino.repository.Order { }

/**
 * 注文番号リポジトリ
 */
export class OrderNumber extends cinerino.repository.OrderNumber { }

export namespace place {
    /**
     * 入場場所リポジトリ
     */
    export class CheckinGate extends CheckinGateRepo { }
}

/**
 * 購入番号リポジトリ
 */
export class PaymentNo extends PaymentNoRepo { }
/**
 * パフォーマンスリポジトリ
 */
export class Performance extends PerformanceRepo { }
/**
 * 会員リポジトリ
 */
export class Person extends PersonRepo { }
/**
 * プロジェクトリポジトリ
 */
export class Project extends cinerino.repository.Project { }
/**
 * 予約リポジトリ
 */
export class Reservation extends ReservationRepo { }
/**
 * 販売者リポジトリ
 */
export class Seller extends cinerino.repository.Seller { }
/**
 * タスクリポジトリ
 */
export class Task extends cinerino.repository.Task { }
/**
 * トークンリポジトリ
 */
export class Token extends cinerino.repository.Token { }
/**
 * 取引リポジトリ
 */
export class Transaction extends cinerino.repository.Transaction { }
