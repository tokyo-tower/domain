// tslint:disable:max-classes-per-file

/**
 * TTTSリポジトリー
 * @namespace repository
 */

import { MongoRepository as AuthorizeActionRepo } from './repo/action/authorize';
import { MongoRepository as CreditCardAuthorizeActionRepo } from './repo/action/authorize/creditCard';
import { MongoRepository as SeatReservationAuthorizeActionRepo } from './repo/action/authorize/seatReservation';
import { MongoRepository as AggregateSaleRepo } from './repo/aggregateSale';
import { MongoRepository as GMONotificationRepo } from './repo/gmoNotification';
import { RedisRepository as PerformanceAvailabilityRepo } from './repo/itemAvailability/performance';
import { RedisRepository as SeatReservationOfferAvailabilityRepo } from './repo/itemAvailability/seatReservationOffer';
import { RedisRepository as ExhibitionEventOffer } from './repo/offer/exhibitionEvent';
import { MongoRepository as OrderRepo } from './repo/order';
import { MongoRepository as OrganizationRepo } from './repo/organization';
import { RedisRepository as PaymentNoRepo } from './repo/paymentNo';
import { MongoRepository as PerformanceRepo, RedisRepository as PerformanceWithAggregationRepo } from './repo/performance';
import { RedisRepository as CheckinGateRepo } from './repo/place/checkinGate';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from './repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as SendGridEventRepo } from './repo/sendGridEvent';
import { MongoRepository as StockRepo } from './repo/stock';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TelemetryRepo } from './repo/telemetry';
import { RedisRepository as TokenRepo } from './repo/token';
import { MongoRepository as TransactionRepo } from './repo/transaction';

/**
 * 売上集計リポジトリー
 */
export class AggregateSale extends AggregateSaleRepo { }

export namespace action {
    /**
     * 承認アクションリポジトリー
     */
    export class Authorize extends AuthorizeActionRepo { }
    export namespace authorize {
        /**
         * クレジットカード承認アクションリポジトリー
         */
        export class CreditCard extends CreditCardAuthorizeActionRepo { }
        /**
         * 座席予約承認アクションリポジトリー
         */
        export class SeatReservation extends SeatReservationAuthorizeActionRepo { }
    }
}

export namespace itemAvailability {
    /**
     * パフォーマンス在庫状況リポジトリー
     */
    // tslint:disable-next-line:no-shadowed-variable
    export class Performance extends PerformanceAvailabilityRepo { }
    /**
     * 座席予約オファー在庫状況リポジトリー
     */
    export class SeatReservationOffer extends SeatReservationOfferAvailabilityRepo { }
}

/**
 * GMO通知リポジトリー
 */
export class GMONotification extends GMONotificationRepo { }

export namespace rateLimit {
    /**
     * 券種カテゴリーレート制限リポジトリー
     */
    export class TicketTypeCategory extends TicketTypeCategoryRateLimitRepo { }
}

export namespace offer {
    /**
     * 展示イベントの販売情報リポジトリー
     */
    export class ExhibitionEvent extends ExhibitionEventOffer { }
}

/**
 * 注文リポジトリー
 */
export class Order extends OrderRepo { }

/**
 * 組織リポジトリー
 */
export class Organization extends OrganizationRepo { }

export namespace place {
    /**
     * 入場場所リポジトリー
     */
    export class CheckinGate extends CheckinGateRepo { }
}

/**
 * 購入番号リポジトリー
 */
export class PaymentNo extends PaymentNoRepo { }
/**
 * パフォーマンスリポジトリー
 */
export class Performance extends PerformanceRepo { }
/**
 * 集計データ付きパフォーマンスリポジトリー
 */
export class PerformanceWithAggregation extends PerformanceWithAggregationRepo { }
/**
 * 予約リポジトリー
 */
export class Reservation extends ReservationRepo { }
/**
 * SendGridイベントリポジトリー
 */
export class SendGridEvent extends SendGridEventRepo { }
/**
 * 在庫リポジトリー
 */
export class Stock extends StockRepo { }
/**
 * タスクリポジトリー
 */
export class Task extends TaskRepo { }
/**
 * 測定データリポジトリー
 */
export class Telemetry extends TelemetryRepo { }
/**
 * トークンリポジトリー
 */
export class Token extends TokenRepo { }
/**
 * 取引リポジトリー
 */
export class Transaction extends TransactionRepo { }
/**
 * 車椅子予約数リポジトリー
 */
// export class WheelchairReservationCount extends WheelchairReservationCountRepo { }
