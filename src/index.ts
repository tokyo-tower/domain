/**
 * TTTSドメインモジュール
 * @module
 */

import * as GMO from '@motionpicture/gmo-service';
import * as mongoose from 'mongoose';
import * as redis from 'redis';

import * as Models from './repo/mongoose';

import * as CommonUtil from './util/common';
import * as EmailQueueUtil from './util/emailQueue';
import * as GMONotificationUtil from './util/gmoNotification';
import * as OwnerUtil from './util/owner';
import * as ReservationUtil from './util/reservation';
import * as TicketTypeGroupUtil from './util/ticketTypeGroup';

import { MongoRepository as OwnerRepo } from './repo/owner';
import { MongoRepository as PaymentNoRepo } from './repo/paymentNo';
import { MongoRepository as PerformanceRepo } from './repo/performance';
import { RedisRepository as PerformanceStatusesRepo } from './repo/performanceStatuses';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as StockRepo } from './repo/stock';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TransactionRepo } from './repo/transaction';

import * as ItemAvailabilityService from './service/itemAvailability';
import * as NotificationService from './service/notification';
import * as OrderService from './service/order';
import * as SalesService from './service/sales';
import * as StockService from './service/stock';
import * as TaskService from './service/task';
import * as PlaceOrderTransactionService from './service/transaction/placeOrder';
import * as PlaceOrderInProgressTransactionService from './service/transaction/placeOrderInProgress';
import * as ReturnOrderTransactionService from './service/transaction/returnOrder';

import * as factory from './factory';

/**
 * MongoDBクライアント`mongoose`
 * @example
 * var promise = ttts.mongoose.connect('mongodb://localhost/myapp', {
 *     useMongoClient: true
 * });
 */
(<any>mongoose).Promise = global.Promise;
export import mongoose = mongoose;

/**
 * Redis Cacheクライアント
 * @example
 * const client = sskts.redis.createClient({
 *      host: process.env.REDIS_HOST,
 *      port: process.env.REDIS_PORT,
 *      password: process.env.REDIS_KEY,
 *      tls: { servername: process.env.TEST_REDIS_HOST }
 * });
 */
export import redis = redis;

export import GMO = GMO;

export {
    Models,
    CommonUtil,
    EmailQueueUtil,
    GMONotificationUtil,
    OwnerUtil,
    ReservationUtil,
    TicketTypeGroupUtil
};

// tslint:disable:max-classes-per-file
export namespace repository {
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
     * 取引レポジトリー
     */
    export class Transaction extends TransactionRepo { }
}

export namespace service {
    export import itemAvailability = ItemAvailabilityService;
    export import notification = NotificationService;
    export import order = OrderService;
    export import sales = SalesService;
    export import stock = StockService;
    export import task = TaskService;
    export namespace transaction {
        export import placeOrder = PlaceOrderTransactionService;
        export import placeOrderInProgress = PlaceOrderInProgressTransactionService;
        export import returnOrder = ReturnOrderTransactionService;
    }
}

export import factory = factory;
