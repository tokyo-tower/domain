/**
 * TTTSドメインモジュール
 *
 * @global
 */

import * as mongoose from 'mongoose';

import * as Models from './model/mongoose';
import * as PerformanceStatusesModel from './model/performanceStatuses';

import * as CommonUtil from './../lib/util/common';
import * as EmailQueueUtil from './../lib/util/emailQueue';
import * as FilmUtil from './../lib/util/film';
import * as GMONotificationUtil from './../lib/util/gmoNotification';
import * as OwnerUtil from './../lib/util/owner';
import * as PerformanceUtil from './../lib/util/performance';
import * as ReservationUtil from './../lib/util/reservation';
import * as ScreenUtil from './../lib/util/screen';
import * as TicketTypeGroupUtil from './../lib/util/ticketTypeGroup';

/**
 * MongoDBクライアント`mongoose`
 *
 * @example
 * var promise = ttts.mongoose.connect('mongodb://localhost/myapp', {
 *     useMongoClient: true
 * });
 */
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
