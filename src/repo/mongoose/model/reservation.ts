import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';
import ticketCancelCharge from './schemaTypes/ticketCancelCharge';
import tttsExtensionTicketType from './schemaTypes/tttsExtensionTicketType';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

const performanceExtentedSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 予約スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        performance_day: String,
        performance_open_time: String,
        performance_start_time: String,
        performance_end_time: String,
        performance_start_date: Date,
        performance_end_date: Date,
        performance_door_time: Date,
        performance_ttts_extension: performanceExtentedSchema,

        theater: String,
        theater_name: multilingualString,
        theater_address: multilingualString,

        screen: String,
        screen_name: multilingualString,

        film: String,
        film_name: multilingualString,
        film_is_mx4d: Boolean,
        film_copyright: String,

        purchaser_group: String, // 購入者区分
        purchaser_name: String,
        purchaser_last_name: String,
        purchaser_first_name: String,
        purchaser_email: String,
        purchaser_tel: String,
        purchaser_international_tel: String,
        purchaser_age: String, // 生まれた年代
        purchaser_address: String, // 住所
        purchaser_gender: String, // 性別

        payment_no: String, // 購入番号
        payment_seat_index: Number, // 購入座席インデックス
        purchased_at: Date, // 購入確定日時
        payment_method: String, // 決済方法

        seat_grade_name: multilingualString,
        seat_grade_additional_charge: Number,

        ticket_type: String, // 券種
        ticket_type_name: multilingualString,
        ticket_type_charge: Number,
        ticket_cancel_charge: {
            type: [ticketCancelCharge],
            default: []
        },
        ticket_ttts_extension: tttsExtensionTicketType,
        rate_limit_unit_in_seconds: Number,

        watcher_name: String, // 配布先
        watcher_name_updated_at: Date, // 配布先更新日時 default: Date.now

        charge: Number, // 座席単体の料金

        owner_username: String,
        owner_name: String,
        owner_last_name: String,
        owner_first_name: String,
        owner_email: String,
        owner_group: String,

        checkins: { // 入場履歴
            type: [{
                _id: false,
                when: Date, // いつ
                where: String, // どこで
                why: String, // 何のために
                how: String // どうやって
            }],
            default: []
        },

        gmo_order_id: String, // GMOオーダーID
        transaction_agent: mongoose.SchemaTypes.Mixed,

        // 以下Chevreのスキーマを継承
        typeOf: String,
        additionalTicketText: String,
        bookingAgent: mongoose.SchemaTypes.Mixed,
        bookingTime: Date,
        cancelReservationUrl: String,
        checkinUrl: String,
        confirmReservationUrl: String,
        modifiedTime: Date,
        modifyReservationUrl: String,
        numSeats: Number,
        price: mongoose.SchemaTypes.Mixed,
        priceCurrency: String,
        programMembershipUsed: String,
        reservationFor: mongoose.SchemaTypes.Mixed,
        reservationNumber: String,
        reservationStatus: String,
        reservedTicket: mongoose.SchemaTypes.Mixed,
        underName: mongoose.SchemaTypes.Mixed,
        checkedIn: { type: Boolean, default: false },
        attended: { type: Boolean, default: false },
        additionalProperty: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'reservations',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

schema.index(
    { performance_day: 1, status: 1 }
);

// 予約検索
schema.index(
    {
        performance: 1,
        purchaser_group: 1
    }
);

// 予約検索
schema.index(
    {
        status: 1,
        performance_day: 1,
        performance_start_time: 1,
        payment_no: 1,
        ticket_type: 1
    },
    { name: 'findAndSortReservations' }
);

// 予約管理アプリケーションでの新しい予約検索
schema.index(
    {
        reservationStatus: 1,
        'reservationFor.startDate': 1,
        reservationNumber: 1,
        'reservedTicket.ticketType.id': 1,
        'reservedTicket.ticketedSeat.seatNumber': 1
    },
    {
        name: 'searchOnStaffApplication',
        partialFilterExpression: {
            reservationStatus: { $exists: true },
            'reservationFor.startDate': { $exists: true },
            reservationNumber: { $exists: true },
            'reservedTicket.ticketType.id': { $exists: true },
            'reservedTicket.ticketedSeat.seatNumber': { $exists: true }
        }
    }
);

// backendでのレポートダウンロード時に使用
schema.index(
    { order_number: 1 }
);
schema.index(
    { performance_start_date: 1 },
    { name: 'searchByPerformanceStartDate' }
);
schema.index(
    { purchased_at: 1 },
    { name: 'searchByPurchasedAt' }
);

schema.index(
    { modifiedTime: -1 },
    { name: 'searchByModifiedTime-v2' }
);

schema.index(
    { reservationNumber: 1, modifiedTime: -1 },
    { name: 'searchByReservationNumber-v2' }
);

schema.index(
    { reservationStatus: 1, modifiedTime: -1 },
    { name: 'searchByReservationStatus-v2' }
);

schema.index(
    { additionalProperty: 1, modifiedTime: -1 },
    {
        name: 'searchByAdditionalProperty',
        partialFilterExpression: {
            additionalProperty: { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForId-v2',
        partialFilterExpression: {
            'reservationFor.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.startDate': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForStartDate-v2',
        partialFilterExpression: {
            'reservationFor.startDate': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.endDate': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForEndDate',
        partialFilterExpression: {
            'reservationFor.endDate': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatNumber': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatNumber',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatNumber': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.email': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameEmail',
        partialFilterExpression: {
            'underName.email': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.name': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameName',
        partialFilterExpression: {
            'underName.name': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.familyName': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameFamilyName',
        partialFilterExpression: {
            'underName.familyName': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.givenName': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameGivenName',
        partialFilterExpression: {
            'underName.givenName': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.telephone': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameTelephone',
        partialFilterExpression: {
            'underName.telephone': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.identifier': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameIdentifier',
        partialFilterExpression: {
            'underName.identifier': { $exists: true }
        }
    }
);

schema.index(
    { additionalTicketText: 1, modifiedTime: -1 },
    {
        name: 'searchByAdditionalTicketText',
        partialFilterExpression: {
            additionalTicketText: { $exists: true }
        }
    }
);

export default mongoose.model('Reservation', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });
