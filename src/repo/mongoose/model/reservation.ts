import * as mongoose from 'mongoose';
import * as numeral from 'numeral';

import Film from './film';
import Owner from './owner';
import Performance from './performance';
import multilingualString from './schemaTypes/multilingualString';
import ticketCancelCharge from './schemaTypes/ticketCancelCharge';
import tttsExtensionPerformance from './schemaTypes/tttsExtensionPerformance';
import tttsExtensionReservation from './schemaTypes/tttsExtensionReservation';
import tttsExtensionTicketType from './schemaTypes/tttsExtensionTicketType';
import Screen from './screen';
import Theater from './theater';

import * as factory from '../../../factory';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 予約スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String, // qr_strに等しい
        qr_str: {
            type: String,
            required: true
        },
        transaction: {
            type: String,
            required: true
        },
        order_number: {
            type: String,
            required: true
        },
        stock: {
            type: String,
            required: true
        },
        stock_availability_before: {
            type: String,
            required: true
        },
        stock_availability_after: {
            type: String,
            required: true
        },
        performance: {
            type: String,
            ref: Performance.modelName,
            required: true
        },
        seat_code: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true
        },
        reservation_ttts_extension: tttsExtensionReservation,

        performance_day: String,
        performance_open_time: String,
        performance_start_time: String,
        performance_end_time: String,
        performance_start_date: Date,
        performance_end_date: Date,
        performance_door_time: Date,
        performance_canceled: {
            type: Boolean,
            default: false
        },
        performance_ttts_extension: tttsExtensionPerformance,

        theater: {
            type: String,
            ref: Theater.modelName
        },
        theater_name: multilingualString,
        theater_address: multilingualString,

        screen: {
            type: String,
            ref: Screen.modelName
        },
        screen_name: multilingualString,

        film: {
            type: String,
            ref: Film.modelName
        },
        film_name: multilingualString,
        film_is_mx4d: Boolean,
        film_copyright: String,

        purchaser_group: String, // 購入者区分
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

        owner: { // オーナー
            type: mongoose.Schema.Types.ObjectId,
            ref: Owner.modelName
        },
        owner_username: String,
        owner_name: multilingualString,
        owner_email: String,
        owner_group: String,
        owner_signature: String,

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

        gmo_order_id: String // GMOオーダーID
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

schema.virtual('purchaser_name').get(function (this: any) {
    let en = '';

    if (this.get('status') === factory.reservationStatusType.ReservationConfirmed
        || this.get('status') === factory.reservationStatusType.ReservationSecuredExtra) {
        switch (this.purchaser_group) {
            case factory.person.Group.Staff:
                en = `${this.get('owner_name').en} ${this.get('owner_signature')}`;
                break;
            default:
                en = `${this.get('purchaser_first_name')} ${this.get('purchaser_last_name')}`;
                break;
        }
    }

    let ja = '';

    if (this.get('status') === factory.reservationStatusType.ReservationConfirmed
        || this.get('status') === factory.reservationStatusType.ReservationSecuredExtra) {
        switch (this.purchaser_group) {
            case factory.person.Group.Staff:
                ja = `${this.get('owner_name').ja} ${this.get('owner_signature')}`;
                break;
            default:
                ja = `${this.get('purchaser_last_name')} ${this.get('purchaser_first_name')}`;
                break;
        }
    }

    return {
        en: en,
        ja: ja
    };
});

/**
 * 券種金額文字列
 */
schema.virtual('ticket_type_detail_str').get(function (this: any) {
    let charge = 0;
    switch (this.get('purchaser_group')) {
        case factory.person.Group.Staff:
            charge += this.get('ticket_type_charge');

            break;
        default:
            charge += <number>this.get('ticket_type_charge') +
                <number>this.get('seat_grade_additional_charge');

            break;
    }

    let en = this.get('ticket_type_name').en;
    switch (this.get('purchaser_group')) {
        case factory.person.Group.Staff:
            if (charge > 0) {
                en += ` / \\${numeral(charge).format('0,0')}`;
            }

            break;
        default:
            if (charge > 0) {
                en += ` / \\${numeral(charge).format('0,0')}(including tax)`;
                if (this.get('seat_grade_additional_charge') > 0) {
                    en += ` (including ${this.get('seat_grade_name').en} \\` +
                        `${numeral(this.get('seat_grade_additional_charge')).format('0,0')})`;
                }
            }

            break;
    }

    let ja = this.get('ticket_type_name').ja;
    switch (this.get('purchaser_group')) {
        case factory.person.Group.Staff:
            if (charge > 0) {
                ja += ` / \\${numeral(charge).format('0,0')}`;
            }

            break;
        default:
            if (charge > 0) {
                ja += ` / \\${numeral(charge).format('0,0')}(税込)`;
                if (this.get('seat_grade_additional_charge') > 0) {
                    ja += ` (内${this.get('seat_grade_name').ja} \\${numeral(this.get('seat_grade_additional_charge')).format('0,0')})`;
                }
            }

            break;
    }

    return {
        en: en,
        ja: ja
    };
});

export default mongoose.model('Reservation', schema);
