/**
 * TTTSドメインモジュール
 * @module
 */

import * as GMO from '@motionpicture/gmo-service';
import * as mongoose from 'mongoose';

import * as Models from './repo/mongoose';
import * as PerformanceStatusesModel from './repo/performanceStatuses';

import * as CommonUtil from './util/common';
import * as EmailQueueUtil from './util/emailQueue';
import * as GMONotificationUtil from './util/gmoNotification';
import * as OwnerUtil from './util/owner';
import * as PerformanceUtil from './util/performance';
import * as ReservationUtil from './util/reservation';
import * as ScreenUtil from './util/screen';
import * as TicketTypeGroupUtil from './util/ticketTypeGroup';

import { MongoRepository as PerformanceRepo } from './repo/performance';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as StockRepo } from './repo/stock';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TransactionRepo } from './repo/transaction';

import * as NotificationService from './service/notification';
import * as SalesService from './service/sales';
import * as StockService from './service/stock';
import * as TaskService from './service/task';
import * as PlaceOrderTransactionService from './service/transaction/placeOrder';
import * as PlaceOrderInProgressTransactionService from './service/transaction/placeOrderInProgress';

import * as factory from './factory';

/**
 * MongoDBクライアント`mongoose`
 *
 * @example
 * var promise = ttts.mongoose.connect('mongodb://localhost/myapp', {
 *     useMongoClient: true
 * });
 */
(<any>mongoose).Promise = global.Promise;
export import mongoose = mongoose;

export import GMO = GMO;

export {
    Models,
    PerformanceStatusesModel,
    CommonUtil,
    EmailQueueUtil,
    GMONotificationUtil,
    OwnerUtil,
    PerformanceUtil,
    ReservationUtil,
    ScreenUtil,
    TicketTypeGroupUtil
};

// tslint:disable:max-classes-per-file
export namespace repository {
    /**
     * パフォーマンスレポジトリー
     */
    export class Performance extends PerformanceRepo { }
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
    export import notification = NotificationService;
    export import sales = SalesService;
    export import stock = StockService;
    export import task = TaskService;
    export namespace transaction {
        export import placeOrder = PlaceOrderTransactionService;
        export import placeOrderInProgress = PlaceOrderInProgressTransactionService;
    }
}

export import factory = factory;
