/**
 * index module
 */
import * as NotificationService from './service/notification';
import * as OrderReportService from './service/report/order';

import * as factory from '@tokyotower/factory';

import * as repository from './repository';

export namespace service {
    export import notification = NotificationService;
    export namespace report {
        export import order = OrderReportService;
    }
}

export import factory = factory;
export import repository = repository;
