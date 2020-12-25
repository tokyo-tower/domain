/**
 * index module
 */
import * as AggregateService from './service/aggregate';
import * as NotificationService from './service/notification';
import * as OrderReportService from './service/report/order';
import * as TaskService from './service/task';

import * as factory from '@tokyotower/factory';

import * as repository from './repository';

export namespace service {
    export import notification = NotificationService;
    export import aggregate = AggregateService;
    export namespace report {
        export import order = OrderReportService;
    }
    export import task = TaskService;
}

export import factory = factory;
export import repository = repository;
