"use strict";
/**
 * TTTSドメインモジュール
 *
 * @global
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const Models = require("./model/mongoose");
exports.Models = Models;
const PerformanceStatusesModel = require("./model/performanceStatuses");
exports.PerformanceStatusesModel = PerformanceStatusesModel;
const CommonUtil = require("./../lib/util/common");
exports.CommonUtil = CommonUtil;
const EmailQueueUtil = require("./../lib/util/emailQueue");
exports.EmailQueueUtil = EmailQueueUtil;
const FilmUtil = require("./../lib/util/film");
exports.FilmUtil = FilmUtil;
const GMONotificationUtil = require("./../lib/util/gmoNotification");
exports.GMONotificationUtil = GMONotificationUtil;
const OwnerUtil = require("./../lib/util/owner");
exports.OwnerUtil = OwnerUtil;
const PerformanceUtil = require("./../lib/util/performance");
exports.PerformanceUtil = PerformanceUtil;
const ReservationUtil = require("./../lib/util/reservation");
exports.ReservationUtil = ReservationUtil;
const ScreenUtil = require("./../lib/util/screen");
exports.ScreenUtil = ScreenUtil;
const TicketTypeGroupUtil = require("./../lib/util/ticketTypeGroup");
exports.TicketTypeGroupUtil = TicketTypeGroupUtil;
/**
 * MongoDBクライアント`mongoose`
 *
 * @example
 * var promise = ttts.mongoose.connect('mongodb://localhost/myapp', {
 *     useMongoClient: true
 * });
 */
mongoose.Promise = global.Promise;
exports.mongoose = mongoose;
