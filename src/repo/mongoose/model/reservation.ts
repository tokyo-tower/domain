// tslint:disable:no-invalid-this no-magic-numbers space-before-function-paren
import * as moment from 'moment';
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

import ReservationStatusType from '../../../factory/reservationStatusType';
import * as ReservationUtil from '../../../util/reservation';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 予約スキーマ
 */
const schema = new mongoose.Schema(
    {
        stock: {
            type: String,
            required: true
        },
        stock_availability_before: {
            type: String,
            required: true
        },
        qr_str: {
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
        film_image: String,
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

// 入場済みかどうかは、履歴があるかどうかで判断
schema.virtual('checked_in').get(function (this: any) {
    return ((<any[]>this.checkins).length > 0);
});

// 開始文字列を表示形式で取得できるように
schema.virtual('performance_start_str').get(function (this: any) {
    if (this.performance_day === undefined || this.performance_open_time === undefined || this.performance_start_time === undefined) {
        return {};
    }

    const date = `${moment(`${this.performance_day.substr(0, 4)}-${this.performance_day.substr(4, 2)}-` +
        `${this.performance_day.substr(6)}T00:00:00+09:00`).format('MMMM DD, YYYY')}`;
    const en = `Open: ${this.performance_open_time.substr(0, 2)}:${this.performance_open_time.substr(2)}/` +
        `Start: ${this.performance_start_time.substr(0, 2)}:${this.performance_start_time.substr(2)} on ${date}`;
    const ja = `${this.performance_day.substr(0, 4)}/${this.performance_day.substr(4, 2)}/${this.performance_day.substr(6)} ` +
        // tslint:disable-next-line:max-line-length
        `開場 ${this.performance_open_time.substr(0, 2)}:${this.performance_open_time.substr(2)} 開演 ${this.performance_start_time.substr(0, 2)}:${this.performance_start_time.substr(2)}`;

    return {
        en: en,
        ja: ja
    };
});

schema.virtual('location_str').get(function (this: any) {
    const en = `at ${this.get('screen_name').en}, ${this.get('theater_name').en}`;
    const ja = `${this.get('theater_name').ja} ${this.get('screen_name').ja}`;

    return {
        en: en,
        ja: ja
    };
});

schema.virtual('baloon_content4staff').get(function (this: any) {
    let str = `${this.seat_code}`;
    str += (this.purchaser_group_str !== undefined) ? `<br>${this.purchaser_group_str}` : '';
    str += (this.purchaser_name.ja !== undefined) ? `<br>${this.purchaser_name.ja}` : '';
    str += (this.watcher_name !== undefined) ? `<br>${this.watcher_name}` : '';
    str += (this.status_str !== undefined) ? `<br>${this.status_str}` : '';

    return str;
});

schema.virtual('purchaser_name').get(function (this: any) {
    let en = '';

    if (this.get('status') === ReservationStatusType.ReservationConfirmed
        || this.get('status') === ReservationStatusType.ReservationSecuredExtra) {
        switch (this.purchaser_group) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
                en = `${this.get('owner_name').en} ${this.get('owner_signature')}`;
                break;
            default:
                en = `${this.get('purchaser_first_name')} ${this.get('purchaser_last_name')}`;
                break;
        }
    }

    let ja = '';

    if (this.get('status') === ReservationStatusType.ReservationConfirmed
        || this.get('status') === ReservationStatusType.ReservationSecuredExtra) {
        switch (this.purchaser_group) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
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

schema.virtual('purchaser_group_str').get(function (this: any) {
    let str = '';

    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
            str = '一般';
            break;
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            str = '内部関係者';
            break;
        default:
            break;
    }

    return str;
});

schema.virtual('status_str').get(function (this: any) {
    let str = '';

    switch (this.get('status')) {
        case ReservationStatusType.ReservationConfirmed:
        case ReservationStatusType.ReservationSecuredExtra:
            str = '予約済';
            break;

        default:
            break;
    }

    return str;
});

/**
 * QRコード文字列分割
 * 上映日-購入番号-購入座席インデックス
 */
// tslint:disable-next-line:no-function-expression
schema.static('parse_from_qr_str', function (qrStr: string) {
    const qr: string[] = qrStr.split('-');
    const qrInfo: any = {};
    if (qr.length > 0) {
        qrInfo.performance_day = qr[0];
    }
    if (qr.length > 1) {
        qrInfo.payment_no = qr[1];
    }
    // tslint:disable-next-line:no-magic-numbers
    if (qr.length > 2) {
        // tslint:disable-next-line:no-magic-numbers
        qrInfo.payment_seat_index = qr[2];
    }

    return qrInfo;
});

/**
 * 券種金額文字列
 */
schema.virtual('ticket_type_detail_str').get(function (this: any) {
    let charge = 0;
    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            charge += this.get('ticket_type_charge');

            break;
        default:
            charge += <number>this.get('ticket_type_charge') +
                <number>this.get('seat_grade_additional_charge');

            break;
    }

    let en = this.get('ticket_type_name').en;
    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_STAFF:
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
        case ReservationUtil.PURCHASER_GROUP_STAFF:
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
