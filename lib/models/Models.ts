import mongoose = require('mongoose');

import AuthenticationSchema from '../models/Authentication/AuthenticationSchema';
import CustomerCancelRequestSchema from '../models/CustomerCancelRequest/CustomerCancelRequestSchema';
import FilmSchema from '../models/Film/FilmSchema';
import GMONotificationSchema from '../models/GMONotification/GMONotificationSchema';
import MemberSchema from '../models/Member/MemberSchema';
import PerformanceSchema from '../models/Performance/PerformanceSchema';
import PreCustomerSchema from '../models/PreCustomer/PreCustomerSchema';
import ReservationSchema from '../models/Reservation/ReservationSchema';
import ReservationEmailCueSchema from '../models/ReservationEmailCue/ReservationEmailCueSchema';
import ScreenSchema from '../models/Screen/ScreenSchema';
import SendGridEventNotificationSchema from '../models/SendGridEventNotification/SendGridEventNotificationSchema';
import SequenceSchema from '../models/Sequence/SequenceSchema';
import SponsorSchema from '../models/Sponsor/SponsorSchema';
import StaffSchema from '../models/Staff/StaffSchema';
import TelStaffSchema from '../models/TelStaff/TelStaffSchema';
import TheaterSchema from '../models/Theater/TheaterSchema';
import TicketTypeGroupSchema from '../models/TicketTypeGroup/TicketTypeGroupSchema';
import WindowSchema from '../models/Window/WindowSchema';

/**
 * 作品と予約の整合性を保つ
 */
FilmSchema.post('findOneAndUpdate', function(err, doc, next){
    if (err) return next(err);

    Models.Reservation.update(
        {
            film: doc['_id']
        },
        {
            film_name_ja: doc["name"]["ja"],
            film_name_en: doc["name"]["en"],
            film_is_mx4d: doc["is_mx4d"],
            film_copyright: doc["copyright"]
        },
        {multi: true},
        (err, raw) => {
            console.log('related reservations updated.', err, raw);
            next();
        }
    );
});

/**
 * 劇場とパフォーマンスの整合性を保つ
 * 劇場と予約の整合性を保つ
 */
TheaterSchema.post('findOneAndUpdate', function(err, doc, next){
    if (err) return next(err);

    Models.Performance.update(
        {
            theater: doc['_id']
        },
        {
            "theater_name.ja": doc["name"]["ja"],
            "theater_name.en": doc["name"]["en"]
        },
        {multi: true},
        (err, raw) => {
            console.log('related performances updated.', err, raw);

            Models.Reservation.update(
                {
                    theater: doc['_id']
                },
                {
                    theater_name_ja: doc["name"]["ja"],
                    theater_name_en: doc["name"]["en"],
                    theater_address_ja: doc["address"]["ja"],
                    theater_address_en: doc["address"]["en"]
                },
                {multi: true},
                (err, raw) => {
                    console.log('related reservations updated.', err, raw);
                    next();
                }
            );
        }
    );
});

/**
 * スクリーンとパフォーマンスの整合性を保つ
 * スクリーンと予約の整合性を保つ
 */
ScreenSchema.post('findOneAndUpdate', function(err, doc, next){
    if (err) return next(err);

    Models.Performance.update(
        {
            screen: doc['_id']
        },
        {
            "screen_name.ja": doc["name"]["ja"],
            "screen_name.en": doc["name"]["en"]
        },
        {multi: true},
        (err, raw) => {
            console.log('related performances updated.', err, raw);

            Models.Reservation.update(
                {
                    screen: doc['_id']
                },
                {
                    screen_name_ja: doc["name"]["ja"],
                    screen_name_en: doc["name"]["en"]
                },
                {multi: true},
                (err, raw) => {
                    console.log('related reservations updated.', err, raw);
                    next();
                }
            );
        }
    );
});

/**
 * パフォーマンスと予約の整合性を保つ
 */
PerformanceSchema.post('findOneAndUpdate', function(err, doc, next){
    if (err) return next(err);

    Models.Reservation.update(
        {
            performance: doc['_id']
        },
        {
            performance_day: doc['day'],
            performance_open_time: doc['open_time'],
            performance_start_time: doc['start_time'],
            performance_end_time: doc['end_time'],
            performance_canceled: doc['canceled'],
        },
        {multi: true},
        (err, raw) => {
            console.log('related reservation updated.', err, raw);
            next();
        }
    );
});

/**
 * 外部関係者と予約の整合性を保つ
 */
SponsorSchema.post('findOneAndUpdate', function(err, doc, next){
    if (err) return next(err);

    Models.Reservation.update(
        {
            sponsor: doc['_id']
        },
        {
            sponsor_name: doc['name'],
            sponsor_email: doc['email']
        },
        {multi: true},
        (err, raw) => {
            console.log('related reservation updated.', err, raw);
            next();
        }
    );
});

/**
 * 内部関係者と予約の整合性を保つ
 */
StaffSchema.post('findOneAndUpdate', function(err, doc, next){
    if (err) return next(err);

    Models.Reservation.update(
        {
            staff: doc['_id']
        },
        {
            staff_name: doc['name'],
            staff_email: doc['email']
        },
        {multi: true},
        (err, raw) => {
            console.log('related reservation updated.', err, raw);
            next();
        }
    );
});






let Authentication = mongoose.model('Authentication', AuthenticationSchema);
let CustomerCancelRequest = mongoose.model('CustomerCancelRequest', CustomerCancelRequestSchema);
let Film = mongoose.model('Film', FilmSchema);
let GMONotification = mongoose.model('GMONotification', GMONotificationSchema);
let Member = mongoose.model('Member', MemberSchema);
let Performance = mongoose.model('Performance', PerformanceSchema);
let PreCustomer = mongoose.model('PreCustomer', PreCustomerSchema);
let Reservation = mongoose.model('Reservation', ReservationSchema);
let ReservationEmailCue = mongoose.model('ReservationEmailCue', ReservationEmailCueSchema);
let Screen = mongoose.model('Screen', ScreenSchema);
let SendGridEventNotification = mongoose.model('SendGridEventNotification', SendGridEventNotificationSchema);
let Sequence = mongoose.model('Sequence', SequenceSchema);
let Sponsor = mongoose.model('Sponsor', SponsorSchema);
let Staff = mongoose.model('Staff', StaffSchema);
let TelStaff = mongoose.model('TelStaff', TelStaffSchema);
let Theater = mongoose.model('Theater', TheaterSchema);
let TicketTypeGroup = mongoose.model('TicketTypeGroup', TicketTypeGroupSchema);
let Window = mongoose.model('Window', WindowSchema);

/**
 * MongoDBのモデルをまとめたモジュール
 */
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

export default Models;