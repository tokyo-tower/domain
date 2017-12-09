/**
 * TTTSドメインモジュール
 * @module
 */

import * as mongoose from 'mongoose';

import * as Models from './model/mongoose';
import * as PerformanceStatusesModel from './model/performanceStatuses';

import * as CommonUtil from './util/common';
import * as EmailQueueUtil from './util/emailQueue';
import * as FilmUtil from './util/film';
import * as GMONotificationUtil from './util/gmoNotification';
import * as OwnerUtil from './util/owner';
import * as PerformanceUtil from './util/performance';
import * as ReservationUtil from './util/reservation';
import * as ScreenUtil from './util/screen';
import * as TicketTypeGroupUtil from './util/ticketTypeGroup';

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

export {
    Models,
    PerformanceStatusesModel,
    CommonUtil,
    EmailQueueUtil,
    FilmUtil,
    GMONotificationUtil,
    OwnerUtil,
    PerformanceUtil,
    ReservationUtil,
    ScreenUtil,
    TicketTypeGroupUtil
};
