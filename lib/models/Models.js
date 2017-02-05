"use strict";
const mongoose = require("mongoose");
const AuthenticationSchema_1 = require("../models/Authentication/AuthenticationSchema");
const CustomerCancelRequestSchema_1 = require("../models/CustomerCancelRequest/CustomerCancelRequestSchema");
const FilmSchema_1 = require("../models/Film/FilmSchema");
const GMONotificationSchema_1 = require("../models/GMONotification/GMONotificationSchema");
const MemberSchema_1 = require("../models/Member/MemberSchema");
const PerformanceSchema_1 = require("../models/Performance/PerformanceSchema");
const PreCustomerSchema_1 = require("../models/PreCustomer/PreCustomerSchema");
const ReservationSchema_1 = require("../models/Reservation/ReservationSchema");
const ReservationEmailCueSchema_1 = require("../models/ReservationEmailCue/ReservationEmailCueSchema");
const ScreenSchema_1 = require("../models/Screen/ScreenSchema");
const SendGridEventNotificationSchema_1 = require("../models/SendGridEventNotification/SendGridEventNotificationSchema");
const SequenceSchema_1 = require("../models/Sequence/SequenceSchema");
const SponsorSchema_1 = require("../models/Sponsor/SponsorSchema");
const StaffSchema_1 = require("../models/Staff/StaffSchema");
const TelStaffSchema_1 = require("../models/TelStaff/TelStaffSchema");
const TheaterSchema_1 = require("../models/Theater/TheaterSchema");
const TicketTypeGroupSchema_1 = require("../models/TicketTypeGroup/TicketTypeGroupSchema");
const WindowSchema_1 = require("../models/Window/WindowSchema");
FilmSchema_1.default.post('findOneAndUpdate', function (err, doc, next) {
    if (err)
        return next(err);
    Models.Reservation.update({
        film: doc['_id']
    }, {
        film_name_ja: doc["name"]["ja"],
        film_name_en: doc["name"]["en"],
        film_is_mx4d: doc["is_mx4d"],
        film_copyright: doc["copyright"]
    }, { multi: true }, (err, raw) => {
        console.log('related reservations updated.', err, raw);
        next();
    });
});
TheaterSchema_1.default.post('findOneAndUpdate', function (err, doc, next) {
    if (err)
        return next(err);
    Models.Performance.update({
        theater: doc['_id']
    }, {
        "theater_name.ja": doc["name"]["ja"],
        "theater_name.en": doc["name"]["en"]
    }, { multi: true }, (err, raw) => {
        console.log('related performances updated.', err, raw);
        Models.Reservation.update({
            theater: doc['_id']
        }, {
            theater_name_ja: doc["name"]["ja"],
            theater_name_en: doc["name"]["en"],
            theater_address_ja: doc["address"]["ja"],
            theater_address_en: doc["address"]["en"]
        }, { multi: true }, (err, raw) => {
            console.log('related reservations updated.', err, raw);
            next();
        });
    });
});
ScreenSchema_1.default.post('findOneAndUpdate', function (err, doc, next) {
    if (err)
        return next(err);
    Models.Performance.update({
        screen: doc['_id']
    }, {
        "screen_name.ja": doc["name"]["ja"],
        "screen_name.en": doc["name"]["en"]
    }, { multi: true }, (err, raw) => {
        console.log('related performances updated.', err, raw);
        Models.Reservation.update({
            screen: doc['_id']
        }, {
            screen_name_ja: doc["name"]["ja"],
            screen_name_en: doc["name"]["en"]
        }, { multi: true }, (err, raw) => {
            console.log('related reservations updated.', err, raw);
            next();
        });
    });
});
PerformanceSchema_1.default.post('findOneAndUpdate', function (err, doc, next) {
    if (err)
        return next(err);
    Models.Reservation.update({
        performance: doc['_id']
    }, {
        performance_day: doc['day'],
        performance_open_time: doc['open_time'],
        performance_start_time: doc['start_time'],
        performance_end_time: doc['end_time'],
        performance_canceled: doc['canceled'],
    }, { multi: true }, (err, raw) => {
        console.log('related reservation updated.', err, raw);
        next();
    });
});
SponsorSchema_1.default.post('findOneAndUpdate', function (err, doc, next) {
    if (err)
        return next(err);
    Models.Reservation.update({
        sponsor: doc['_id']
    }, {
        sponsor_name: doc['name'],
        sponsor_email: doc['email']
    }, { multi: true }, (err, raw) => {
        console.log('related reservation updated.', err, raw);
        next();
    });
});
StaffSchema_1.default.post('findOneAndUpdate', function (err, doc, next) {
    if (err)
        return next(err);
    Models.Reservation.update({
        staff: doc['_id']
    }, {
        staff_name: doc['name'],
        staff_email: doc['email']
    }, { multi: true }, (err, raw) => {
        console.log('related reservation updated.', err, raw);
        next();
    });
});
let Authentication = mongoose.model('Authentication', AuthenticationSchema_1.default);
let CustomerCancelRequest = mongoose.model('CustomerCancelRequest', CustomerCancelRequestSchema_1.default);
let Film = mongoose.model('Film', FilmSchema_1.default);
let GMONotification = mongoose.model('GMONotification', GMONotificationSchema_1.default);
let Member = mongoose.model('Member', MemberSchema_1.default);
let Performance = mongoose.model('Performance', PerformanceSchema_1.default);
let PreCustomer = mongoose.model('PreCustomer', PreCustomerSchema_1.default);
let Reservation = mongoose.model('Reservation', ReservationSchema_1.default);
let ReservationEmailCue = mongoose.model('ReservationEmailCue', ReservationEmailCueSchema_1.default);
let Screen = mongoose.model('Screen', ScreenSchema_1.default);
let SendGridEventNotification = mongoose.model('SendGridEventNotification', SendGridEventNotificationSchema_1.default);
let Sequence = mongoose.model('Sequence', SequenceSchema_1.default);
let Sponsor = mongoose.model('Sponsor', SponsorSchema_1.default);
let Staff = mongoose.model('Staff', StaffSchema_1.default);
let TelStaff = mongoose.model('TelStaff', TelStaffSchema_1.default);
let Theater = mongoose.model('Theater', TheaterSchema_1.default);
let TicketTypeGroup = mongoose.model('TicketTypeGroup', TicketTypeGroupSchema_1.default);
let Window = mongoose.model('Window', WindowSchema_1.default);
let Models = {
    Authentication,
    CustomerCancelRequest,
    Film,
    GMONotification,
    Member,
    Performance,
    PreCustomer,
    Reservation,
    ReservationEmailCue,
    Screen,
    SendGridEventNotification,
    Sequence,
    Sponsor,
    Staff,
    TelStaff,
    Theater,
    TicketTypeGroup,
    Window
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Models;
