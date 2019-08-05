// tslint:disable:max-classes-per-file
/**
 * リポジトリ
 */
import { MongoRepository as AuthorizeActionRepo } from './repo/action/authorize';
import { MongoRepository as AggregateSaleRepo } from './repo/aggregateSale';
import { RedisRepository as EventWithAggregationRepo } from './repo/event';
import { MongoRepository as OrderRepo } from './repo/order';
import { RedisRepository as PaymentNoRepo } from './repo/paymentNo';
import { MongoRepository as PerformanceRepo } from './repo/performance';
import { CognitoRepository as PersonRepo } from './repo/person';
import { RedisRepository as CheckinGateRepo } from './repo/place/checkinGate';
import { MongoRepository as ProjectRepo } from './repo/project';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from './repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as SellerRepo } from './repo/seller';
import { MongoRepository as TaskRepo } from './repo/task';
import { RedisRepository as TokenRepo } from './repo/token';
import { MongoRepository as TransactionRepo } from './repo/transaction';

/**
 * 売上集計リポジトリ
 */
export class AggregateSale extends AggregateSaleRepo { }

export namespace action {
    /**
     * 承認アクションリポジトリ
     */
    export class Authorize extends AuthorizeActionRepo { }
}

/**
 * 集計データ付きイベントリポジトリ
 */
export class EventWithAggregation extends EventWithAggregationRepo { }

export namespace rateLimit {
    /**
     * 券種カテゴリーレート制限リポジトリ
     */
    export class TicketTypeCategory extends TicketTypeCategoryRateLimitRepo { }
}

/**
 * 注文リポジトリ
 */
export class Order extends OrderRepo { }

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
export class Project extends ProjectRepo { }
/**
 * 予約リポジトリ
 */
export class Reservation extends ReservationRepo { }
/**
 * 販売者リポジトリ
 */
export class Seller extends SellerRepo { }
/**
 * タスクリポジトリ
 */
export class Task extends TaskRepo { }
/**
 * トークンリポジトリ
 */
export class Token extends TokenRepo { }
/**
 * 取引リポジトリ
 */
export class Transaction extends TransactionRepo { }
