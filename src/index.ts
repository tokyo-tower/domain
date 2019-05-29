/**
 * TTTSドメインモジュール
 */
import * as GMO from '@motionpicture/gmo-service';
import * as AWS from 'aws-sdk';
import * as mongoose from 'mongoose';
import * as redis from 'redis';

import * as CommonUtil from './util/common';

import * as AdminService from './service/admin';
import * as AggregateService from './service/aggregate';
import * as ItemAvailabilityService from './service/itemAvailability';
import * as NotificationService from './service/notification';
import * as OfferService from './service/offer';
import * as OrderService from './service/order';
import * as PerformanceService from './service/performance';
import * as ReportService from './service/report';
import * as SalesService from './service/sales';
import * as StockService from './service/stock';
import * as TaskService from './service/task';
import * as PlaceOrderTransactionService from './service/transaction/placeOrder';
import * as PlaceOrderInProgressTransactionService from './service/transaction/placeOrderInProgress';
import * as ReturnOrderTransactionService from './service/transaction/returnOrder';
import * as UtilService from './service/util';

import * as factory from '@motionpicture/ttts-factory';
import * as repository from './repository';

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
 * const client = ttts.redis.createClient({
 *      host: process.env.REDIS_HOST,
 *      port: process.env.REDIS_PORT,
 *      password: process.env.REDIS_KEY,
 *      tls: { servername: process.env.TEST_REDIS_HOST }
 * });
 */
export import redis = redis;

export import GMO = GMO;

/**
 * AWS SDK
 */
export import AWS = AWS;

export {
    CommonUtil
};

export namespace service {
    export import admin = AdminService;
    export import itemAvailability = ItemAvailabilityService;
    export import notification = NotificationService;
    export import offer = OfferService;
    export import order = OrderService;
    export import performance = PerformanceService;
    export import report = ReportService;
    export import aggregate = AggregateService;
    export import sales = SalesService;
    export import stock = StockService;
    export import task = TaskService;
    export namespace transaction {
        export import placeOrder = PlaceOrderTransactionService;
        export import placeOrderInProgress = PlaceOrderInProgressTransactionService;
        export import returnOrder = ReturnOrderTransactionService;
    }
    export import util = UtilService;
}

export import factory = factory;
export import repository = repository;
