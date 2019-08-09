/**
 * index module
 */
import * as cinerino from '@cinerino/domain';
import * as GMO from '@motionpicture/gmo-service';
import * as AWS from 'aws-sdk';
import * as redis from 'redis';

import * as AdminService from './service/admin';
import * as AggregateService from './service/aggregate';
import * as NotificationService from './service/notification';
import * as OfferService from './service/offer';
import * as OrderService from './service/order';
import * as PerformanceService from './service/performance';
import * as ReserveService from './service/reserve';
import * as SalesService from './service/sales';
import * as StockService from './service/stock';
import * as TaskService from './service/task';
import * as PlaceOrderTransactionService from './service/transaction/placeOrder';
import * as PlaceOrderInProgressTransactionService from './service/transaction/placeOrderInProgress';
import * as ReturnOrderTransactionService from './service/transaction/returnOrder';

import * as factory from '@tokyotower/factory';

import * as chevre from './chevre';
import * as repository from './repository';

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

export import chevre = chevre;

/**
 * AWS SDK
 */
export import AWS = AWS;

export namespace service {
    export import admin = AdminService;
    export import notification = NotificationService;
    export import offer = OfferService;
    export import order = OrderService;
    export import payment = cinerino.service.payment;
    export import performance = PerformanceService;
    export import reserve = ReserveService;
    export import aggregate = AggregateService;
    export import sales = SalesService;
    export import stock = StockService;
    export import task = TaskService;
    export namespace transaction {
        export import placeOrder = PlaceOrderTransactionService;
        export import placeOrderInProgress = PlaceOrderInProgressTransactionService;
        export import returnOrder = ReturnOrderTransactionService;
    }
    export import util = cinerino.service.util;
}

export import factory = factory;
export import repository = repository;
