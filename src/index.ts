/**
 * index module
 */
import * as AWS from 'aws-sdk';
import * as redis from 'redis';

import * as AdminService from './service/admin';
import * as AggregateService from './service/aggregate';
import * as NotificationService from './service/notification';
import * as PerformanceService from './service/performance';
import * as ReserveService from './service/reserve';
import * as TaskService from './service/task';

import * as factory from '@tokyotower/factory';

import * as repository from './repository';

/**
 * Redis Cacheクライアント
 */
export import redis = redis;

/**
 * AWS SDK
 */
export import AWS = AWS;

export namespace service {
    export import admin = AdminService;
    export import notification = NotificationService;
    export import performance = PerformanceService;
    export import reserve = ReserveService;
    export import aggregate = AggregateService;
    export import task = TaskService;
}

export import factory = factory;
export import repository = repository;
