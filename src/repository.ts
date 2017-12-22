// tslint:disable:max-classes-per-file

/**
 * TTTSリポジトリー
 * @namespace repository
 */

import { MongoRepository as AuthorizeActionRepo } from './repo/action/authorize';
import { MongoRepository as CreditCardAuthorizeActionRepo } from './repo/action/authorize/creditCard';
import { MongoRepository as SeatReservationAuthorizeActionRepo } from './repo/action/authorize/seatReservation';
import { RedisRepository as SeatReservationOfferAvailabilityRepo } from './repo/itemAvailability/seatReservationOffer';
import { MongoRepository as OrganizationRepo } from './repo/organization';
import { MongoRepository as OwnerRepo } from './repo/owner';
import { MongoRepository as PaymentNoRepo } from './repo/paymentNo';
import { MongoRepository as PerformanceRepo } from './repo/performance';
import { RedisRepository as PerformanceStatusesRepo } from './repo/performanceStatuses';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from './repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as StockRepo } from './repo/stock';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TelemetryRepo } from './repo/telemetry';
import { RedisRepository as TokenRepo } from './repo/token';
import { MongoRepository as TransactionRepo } from './repo/transaction';
// import { RedisRepository as WheelchairReservationCountRepo } from './repo/wheelchairReservationCount';

export namespace action {
    /**
     * 承認アクションレポジトリー
     */
    export class Authorize extends AuthorizeActionRepo { }
    export namespace authorize {
        /**
         * クレジットカード承認アクションレポジトリー
         */
        export class CreditCard extends CreditCardAuthorizeActionRepo { }
        /**
         * 座席予約承認アクションレポジトリー
         */
        export class SeatReservation extends SeatReservationAuthorizeActionRepo { }
    }
}

export namespace itemAvailability {
    /**
     * 座席予約オファー在庫状況リポジトリー
     */
    export class SeatReservationOffer extends SeatReservationOfferAvailabilityRepo { }
}

export namespace rateLimit {
    /**
     * 券種カテゴリーレート制限リポジトリー
     */
    export class TicketTypeCategory extends TicketTypeCategoryRateLimitRepo { }
}

/**
 * 組織リポジトリー
 */
export class Organization extends OrganizationRepo { }

/**
 * 所有者レポジトリー
 */
export class Owner extends OwnerRepo { }
/**
 * 購入番号レポジトリー
 */
export class PaymentNo extends PaymentNoRepo { }
/**
 * パフォーマンスレポジトリー
 */
export class Performance extends PerformanceRepo { }
/**
 * パフォーマンス在庫状況レポジトリー
 */
export class PerformanceStatuses extends PerformanceStatusesRepo { }
/**
 * 予約レポジトリー
 */
export class Reservation extends ReservationRepo { }
/**
 * 在庫レポジトリー
 */
export class Stock extends StockRepo { }
/**
 * タスクレポジトリー
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
 * 取引レポジトリー
 */
export class Transaction extends TransactionRepo { }
/**
 * 車椅子予約数リポジトリー
 */
// export class WheelchairReservationCount extends WheelchairReservationCountRepo { }
