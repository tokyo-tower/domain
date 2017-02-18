/**
 * MongoDBのモデルをまとめたモジュール
 *
 * @namespace
 */

import { model as Authentication } from '../models/Authentication/AuthenticationModel';
import { model as CustomerCancelRequest } from '../models/CustomerCancelRequest/CustomerCancelRequestModel';
import { model as Film } from '../models/Film/FilmModel';
import { model as GMONotification } from '../models/GMONotification/GMONotificationModel';
import { model as Member } from '../models/Member/MemberModel';
import { model as Performance } from '../models/Performance/PerformanceModel';
import { model as PreCustomer } from '../models/PreCustomer/PreCustomerModel';
import { model as Reservation } from '../models/Reservation/ReservationModel';
import { model as ReservationEmailCue } from '../models/ReservationEmailCue/ReservationEmailCueModel';
import { model as Screen } from '../models/Screen/ScreenModel';
import { model as SendGridEventNotification } from '../models/SendGridEventNotification/SendGridEventNotificationModel';
import { model as Sequence } from '../models/Sequence/SequenceModel';
import { model as Sponsor } from '../models/Sponsor/SponsorModel';
import { model as Staff } from '../models/Staff/StaffModel';
import { model as TelStaff } from '../models/TelStaff/TelStaffModel';
import { model as Theater } from '../models/Theater/TheaterModel';
import { model as TicketTypeGroup } from '../models/TicketTypeGroup/TicketTypeGroupModel';
import { model as Window } from '../models/Window/WindowModel';

/**
 * 作品と予約の整合性を保つ
 */
// Film.schema.post('findOneAndUpdate', function(err, doc, next){
//     if (err) return next(err);

//     Reservation.update(
//         {
//             film: doc['_id']
//         },
//         {
//             film_name_ja: doc["name"]["ja"],
//             film_name_en: doc["name"]["en"],
//             film_is_mx4d: doc["is_mx4d"],
//             film_copyright: doc["copyright"]
//         },
//         {multi: true},
//         (err, raw) => {
//             console.log('related reservations updated.', err, raw);
//             next();
//         }
//     );
// });

/**
 * 劇場とパフォーマンスの整合性を保つ
 * 劇場と予約の整合性を保つ
 */
// Theater.schema.post('findOneAndUpdate', function(err, doc, next){
//     if (err) return next(err);

//     Performance.update(
//         {
//             theater: doc['_id']
//         },
//         {
//             "theater_name.ja": doc["name"]["ja"],
//             "theater_name.en": doc["name"]["en"]
//         },
//         {multi: true},
//         (err, raw) => {
//             console.log('related performances updated.', err, raw);

//             Reservation.update(
//                 {
//                     theater: doc['_id']
//                 },
//                 {
//                     theater_name_ja: doc["name"]["ja"],
//                     theater_name_en: doc["name"]["en"],
//                     theater_address_ja: doc["address"]["ja"],
//                     theater_address_en: doc["address"]["en"]
//                 },
//                 {multi: true},
//                 (err, raw) => {
//                     console.log('related reservations updated.', err, raw);
//                     next();
//                 }
//             );
//         }
//     );
// });

/**
 * スクリーンとパフォーマンスの整合性を保つ
 * スクリーンと予約の整合性を保つ
 */
// Screen.schema.post('findOneAndUpdate', function(err, doc, next){
//     if (err) return next(err);

//     Performance.update(
//         {
//             screen: doc['_id']
//         },
//         {
//             "screen_name.ja": doc["name"]["ja"],
//             "screen_name.en": doc["name"]["en"]
//         },
//         {multi: true},
//         (err, raw) => {
//             console.log('related performances updated.', err, raw);

//             Reservation.update(
//                 {
//                     screen: doc['_id']
//                 },
//                 {
//                     screen_name_ja: doc["name"]["ja"],
//                     screen_name_en: doc["name"]["en"]
//                 },
//                 {multi: true},
//                 (err, raw) => {
//                     console.log('related reservations updated.', err, raw);
//                     next();
//                 }
//             );
//         }
//     );
// });

/**
 * パフォーマンスと予約の整合性を保つ
 */
// Performance.schema.post('findOneAndUpdate', function(err, doc, next){
//     if (err) return next(err);

//     Reservation.update(
//         {
//             performance: doc['_id']
//         },
//         {
//             performance_day: doc['day'],
//             performance_open_time: doc['open_time'],
//             performance_start_time: doc['start_time'],
//             performance_end_time: doc['end_time'],
//             performance_canceled: doc['canceled'],
//         },
//         {multi: true},
//         (err, raw) => {
//             console.log('related reservation updated.', err, raw);
//             next();
//         }
//     );
// });

/**
 * 外部関係者と予約の整合性を保つ
 */
// Sponsor.schema.post('findOneAndUpdate', function(err, doc, next){
//     if (err) return next(err);

//     Reservation.update(
//         {
//             sponsor: doc['_id']
//         },
//         {
//             sponsor_name: doc['name'],
//             sponsor_email: doc['email']
//         },
//         {multi: true},
//         (err, raw) => {
//             console.log('related reservation updated.', err, raw);
//             next();
//         }
//     );
// });

/**
 * 内部関係者と予約の整合性を保つ
 */
// Staff.schema.post('findOneAndUpdate', function(err, doc, next){
//     if (err) return next(err);

//     Reservation.update(
//         {
//             staff: doc['_id']
//         },
//         {
//             staff_name: doc['name'],
//             staff_email: doc['email']
//         },
//         {multi: true},
//         (err, raw) => {
//             console.log('related reservation updated.', err, raw);
//             next();
//         }
//     );
// });

export {
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
