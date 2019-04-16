// tslint:disable:max-classes-per-file
/**
 * リポジトリ
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
import { RedisRepository as PaymentNoRepo } from './repo/paymentNo';
import { MongoRepository as PerformanceRepo, RedisRepository as PerformanceWithAggregationRepo } from './repo/performance';
import { RedisRepository as CheckinGateRepo } from './repo/place/checkinGate';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from './repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as SellerRepo } from './repo/seller';
import { MongoRepository as SendGridEventRepo } from './repo/sendGridEvent';
import { MongoRepository as StockRepo } from './repo/stock';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TelemetryRepo } from './repo/telemetry';
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
    export namespace authorize {
        /**
         * クレジットカード承認アクションリポジトリ
         */
        export class CreditCard extends CreditCardAuthorizeActionRepo { }
        /**
         * 座席予約承認アクションリポジトリ
         */
        export class SeatReservation extends SeatReservationAuthorizeActionRepo { }
    }
}

export namespace itemAvailability {
    /**
     * パフォーマンス在庫状況リポジトリ
     */
    // tslint:disable-next-line:no-shadowed-variable
    export class Performance extends PerformanceAvailabilityRepo { }
    /**
     * 座席予約オファー在庫状況リポジトリ
     */
    export class SeatReservationOffer extends SeatReservationOfferAvailabilityRepo { }
}

/**
 * GMO通知リポジトリ
 */
export class GMONotification extends GMONotificationRepo { }

export namespace rateLimit {
    /**
     * 券種カテゴリーレート制限リポジトリ
     */
    export class TicketTypeCategory extends TicketTypeCategoryRateLimitRepo { }
}

export namespace offer {
    /**
     * 展示イベントの販売情報リポジトリ
     */
    export class ExhibitionEvent extends ExhibitionEventOffer { }
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
 * 集計データ付きパフォーマンスリポジトリ
 */
export class PerformanceWithAggregation extends PerformanceWithAggregationRepo { }
/**
 * 予約リポジトリ
 */
export class Reservation extends ReservationRepo { }
/**
 * 販売者リポジトリ
 */
export class Seller extends SellerRepo { }
/**
 * SendGridイベントリポジトリ
 */
export class SendGridEvent extends SendGridEventRepo { }
/**
 * 在庫リポジトリ
 */
export class Stock extends StockRepo { }
/**
 * タスクリポジトリ
 */
export class Task extends TaskRepo { }
/**
 * 測定データリポジトリ
 */
export class Telemetry extends TelemetryRepo { }
/**
 * トークンリポジトリ
 */
export class Token extends TokenRepo { }
/**
 * 取引リポジトリ
 */
export class Transaction extends TransactionRepo { }
/**
 * 車椅子予約数リポジトリ
 */
// export class WheelchairReservationCount extends WheelchairReservationCountRepo { }
