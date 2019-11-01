/**
 * index module
 */
import * as cinerino from '@cinerino/domain';
import * as redis from 'redis';

import * as AdminService from './service/admin';
import * as AggregateService from './service/aggregate';
import * as OrderService from './service/order';
import * as PerformanceService from './service/performance';
import * as ReserveService from './service/reserve';
import * as TaskService from './service/task';

import * as factory from '@tokyotower/factory';

import * as chevre from './chevre';
import * as repository from './repository';

/**
 * Redis Cacheクライアント
 */
export import redis = redis;

export import chevre = chevre;

/**
 * AWS SDK
 */
export import AWS = cinerino.AWS;

export namespace service {
    export import admin = AdminService;
    export import notification = cinerino.service.notification;
    export import order = OrderService;
    export import performance = PerformanceService;
    export import reserve = ReserveService;
    export import aggregate = AggregateService;
    export import task = TaskService;
}

export import factory = factory;
export import repository = repository;
