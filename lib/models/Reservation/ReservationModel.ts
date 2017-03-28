// tslint:disable:no-invalid-this no-magic-numbers space-before-function-paren
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as numeral from 'numeral';

import { model as Film } from '../Film/FilmModel';
import { model as Member } from '../Member/MemberModel';
import { model as Performance } from '../Performance/PerformanceModel';
import { model as PreCustomer } from '../PreCustomer/PreCustomerModel';
import { model as Screen } from '../Screen/ScreenModel';
import { model as Sponsor } from '../Sponsor/SponsorModel';
import { model as Staff } from '../Staff/StaffModel';
import { model as TelStaff } from '../TelStaff/TelStaffModel';
import { model as Theater } from '../Theater/TheaterModel';
import { model as Window } from '../Window/WindowModel';
import * as ReservationUtil from './ReservationUtil';

/**
 * 予約スキーマ
 */
const schema = new mongoose.Schema(
    {
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

        expired_at: Date, // 仮予約期限

        performance_day: String,
        performance_open_time: String,
        performance_start_time: String,
        performance_end_time: String,
        performance_canceled: {
            type: Boolean,
            default: false
        },

        theater: {
            type: String,
            ref: Theater.modelName
        },
        theater_name_ja: String,
        theater_name_en: String,
        theater_address_ja: String,
        theater_address_en: String,

        screen: {
            type: String,
            ref: Screen.modelName
        },
        screen_name_ja: String,
        screen_name_en: String,

        film: {
            type: String,
            ref: Film.modelName
        },
        film_name_ja: String,
        film_name_en: String,
        film_image: String,
        film_is_mx4d: Boolean,
        film_copyright: String,

        purchaser_group: String, // 購入者区分
        purchaser_last_name: String,
        purchaser_first_name: String,
        purchaser_email: String,
        purchaser_tel: String,
        purchaser_age: String, // 生まれた年代
        purchaser_address: String, // 住所
        purchaser_gender: String, // 性別

        payment_no: String, // 購入番号
        payment_seat_index: Number, // 購入座席インデックス
        purchased_at: Date, // 購入確定日時
        payment_method: String, // 決済方法

        seat_grade_name_ja: String,
        seat_grade_name_en: String,
        seat_grade_additional_charge: Number,

        ticket_type_code: String,
        ticket_type_name_ja: String,
        ticket_type_name_en: String,
        ticket_type_charge: Number,

        watcher_name: String, // 配布先
        watcher_name_updated_at: Date, // 配布先更新日時 default: Date.now

        charge: Number, // 座席単体の料金

        pre_customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: PreCustomer.modelName
        },
        pre_customer_user_id: String,

        sponsor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Sponsor.modelName
        },
        sponsor_user_id: String,
        sponsor_name: String,
        sponsor_email: String,

        staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Staff.modelName
        },
        staff_user_id: String,
        staff_name: String,
        staff_email: String,
        staff_signature: String,

        member: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Member.modelName
        },
        member_user_id: String,

        window: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Window.modelName
        },
        window_user_id: String,

        tel_staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: TelStaff.modelName
        },
        tel_staff_user_id: String,

        entered: { // 入場フラグ
            type: Boolean,
            default: false
        },
        entered_at: Date, // 入場日時

        gmo_shop_pass_string: String, // GMO決済開始時に送信するチェック文字列

        gmo_shop_id: String,
        gmo_amount: String,
        gmo_tax: String,
        gmo_access_id: String,
        gmo_forward: String,
        gmo_method: String,
        gmo_approve: String,
        gmo_tran_id: String,
        gmo_tran_date: String,
        gmo_pay_type: String,
        gmo_cvs_code: String,
        gmo_cvs_conf_no: String,
        gmo_cvs_receipt_no: String,
        gmo_cvs_receipt_url: String,
        gmo_payment_term: String,
        gmo_status: String,

        paydesign_seq: String,
        paydesign_date: String,
        paydesign_time: String,
        paydesign_sid: String,
        paydesign_kingaku: String,
        paydesign_cvs: String,
        paydesign_scode: String,
        paydesign_fuka: String,

        created_user: String,
        updated_user: String
    },
    {
        collection: 'reservations',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// 開始文字列を表示形式で取得できるように
schema.virtual('performance_start_str_ja').get(function (this: any) {
    return `${this.performance_day.substr(0, 4)}/` +
        `${this.performance_day.substr(4, 2)}/` +
        `${this.performance_day.substr(6)} ` +
        `開場 ${this.performance_open_time.substr(0, 2)}:${this.performance_open_time.substr(2)} ` +
        `開演 ${this.performance_start_time.substr(0, 2)}:${this.performance_start_time.substr(2)}`;
});
schema.virtual('performance_start_str_en').get(function (this: any) {
    const date = `${moment(`${this.performance_day.substr(0, 4)}-` +
        `${this.performance_day.substr(4, 2)}-` +
        `${this.performance_day.substr(6)}T00:00:00+09:00`).format('MMMM DD, YYYY')}`;
    return `Open: ${this.performance_open_time.substr(0, 2)}:${this.performance_open_time.substr(2)}/` +
        `Start: ${this.performance_start_time.substr(0, 2)}:${this.performance_start_time.substr(2)} ` +
        `on ${date}`;
});
schema.virtual('location_str_ja').get(function (this: any) {
    return `${this.get('theater_name_ja')} ${this.get('screen_name_ja')}`;
});
schema.virtual('location_str_en').get(function (this: any) {
    return `at ${this.get('screen_name_en')}, ${this.get('theater_name_en')}`;
});

schema.virtual('baloon_content4staff').get(function (this: any) {
    let str = `${this.seat_code}`;
    str += (this.purchaser_group_str !== undefined) ? `<br>${this.purchaser_group_str}` : '';
    str += (this.purchaser_name_ja !== undefined) ? `<br>${this.purchaser_name_ja}` : '';
    str += (this.watcher_name !== undefined) ? `<br>${this.watcher_name}` : '';
    str += (this.status_str !== undefined) ? `<br>${this.status_str}` : '';

    return str;
});

schema.virtual('purchaser_name_ja').get(function (this: any) {
    let name = '';

    if (
        this.get('status') === ReservationUtil.STATUS_WAITING_SETTLEMENT
        || this.get('status') === ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN
        || this.get('status') === ReservationUtil.STATUS_RESERVED
    ) {
        switch (this.purchaser_group) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
                name = `${this.get('staff_name')} ${this.get('staff_signature')}`;
                break;
            case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                name = `${this.get('sponsor_name')} ${this.get('purchaser_last_name')} ${this.get('purchaser_first_name')}`;
                break;
            default:
                name = `${this.get('purchaser_last_name')} ${this.get('purchaser_first_name')}`;
                break;
        }
    }

    return name;
});

schema.virtual('purchaser_name_en').get(function (this: any) {
    let name = '';

    if (
        this.get('status') === ReservationUtil.STATUS_WAITING_SETTLEMENT
        || this.get('status') === ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN
        || this.get('status') === ReservationUtil.STATUS_RESERVED
    ) {
        switch (this.purchaser_group) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
                name = `${this.get('staff_name')} ${this.get('staff_signature')}`;
                break;
            case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                name = `${this.get('sponsor_name')} ${this.get('purchaser_first_name')} ${this.get('purchaser_last_name')}`;
                break;
            default:
                name = `${this.get('purchaser_first_name')} ${this.get('purchaser_last_name')}`;
                break;
        }
    }

    return name;
});

schema.virtual('purchaser_group_str').get(function (this: any) {
    let str = '';

    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
            str = '一般';
            break;
        case ReservationUtil.PURCHASER_GROUP_MEMBER:
            str = 'メルマガ先行会員';
            break;
        case ReservationUtil.PURCHASER_GROUP_SPONSOR:
            str = '外部関係者';
            break;
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            str = '内部関係者';
            break;
        case ReservationUtil.PURCHASER_GROUP_TEL:
            str = '電話窓口';
            break;
        case ReservationUtil.PURCHASER_GROUP_WINDOW:
            str = '当日窓口';
            break;
        default:
            break;
    }

    return str;
});

schema.virtual('status_str').get(function (this: any) {
    let str = '';

    switch (this.get('status')) {
        case ReservationUtil.STATUS_RESERVED:
            str = '予約済';
            break;

        case ReservationUtil.STATUS_TEMPORARY:
        case ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE:
            str = '仮予約中';
            break;

        case ReservationUtil.STATUS_WAITING_SETTLEMENT:
        case ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN:
            str = '決済中';
            break;

        case ReservationUtil.STATUS_KEPT_BY_CHEVRE:
            str = 'CHEVRE確保中';
            break;

        case ReservationUtil.STATUS_KEPT_BY_MEMBER:
            str = 'メルマガ保留中';
            break;

        default:
            break;
    }

    return str;
});

/**
 * QRコード文字列
 */
schema.virtual('qr_str').get(function (this: any) {
    return `${this.payment_no}-${this.payment_seat_index}`;
});

/**
 * 券種金額文字列
 */
schema.virtual('ticket_type_detail_str_ja').get(function (this: any) {
    let charge = 0;
    let str = this.get('ticket_type_name_ja');

    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_SPONSOR:
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            charge += this.get('ticket_type_charge');
            if (charge > 0) {
                str += ` / \\${numeral(charge).format('0,0')}`;
            }

            break;
        default:
            charge += <number>this.get('ticket_type_charge') +
                <number>this.get('seat_grade_additional_charge') +
                (<boolean>(this.get('film_is_mx4d')) ? ReservationUtil.CHARGE_MX4D : 0);
            if (charge > 0) {
                str += ` / \\${numeral(charge).format('0,0')}(税込)`;
                if (this.get('seat_grade_additional_charge') > 0) {
                    str += ` (内${this.get('seat_grade_name_ja')} \\${numeral(this.get('seat_grade_additional_charge')).format('0,0')})`;
                }
            }

            break;
    }

    return str;
});
schema.virtual('ticket_type_detail_str_en').get(function (this: any) {
    let charge = 0;
    let str = this.get('ticket_type_name_en');

    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_SPONSOR:
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            charge += this.get('ticket_type_charge');
            if (charge > 0) {
                str += ` / \\${numeral(charge).format('0,0')}`;
            }

            break;
        default:
            charge += <number>this.get('ticket_type_charge') +
                <number>this.get('seat_grade_additional_charge') +
                (<boolean>(this.get('film_is_mx4d')) ? ReservationUtil.CHARGE_MX4D : 0);
            if (charge > 0) {
                str += ` / \\${numeral(charge).format('0,0')}(including tax)`;
                if (this.get('seat_grade_additional_charge') > 0) {
                    str += ` (including ${this.get('seat_grade_name_en')} \\` +
                        `${numeral(this.get('seat_grade_additional_charge')).format('0,0')})`;
                }
            }

            break;
    }

    return str;
});

/**
 * CHEVRE確保への更新の場合、パフォーマンス情報だけ残して、購入者情報は削除する
 */
schema.post('findOneAndUpdate', function (this: any, err: any, doc: any, next: any) {
    if (err instanceof Error) {
        return next(err);
    }

    if (doc.get('status') === ReservationUtil.STATUS_KEPT_BY_CHEVRE) {
        const paths4set = [
            '_id', 'performance', 'seat_code', 'status', 'created_at', 'updated_at'
            , 'performance_day', 'performance_open_time', 'performance_start_time', 'performance_end_time', 'performance_canceled'
            , 'theater', 'theater_name_ja', 'theater_name_en', 'theater_address_ja', 'theater_address_en'
            , 'screen', 'screen_name_ja', 'screen_name_en'
            , 'film', 'film_name_ja', 'film_name_en', 'film_image', 'film_is_mx4d', 'film_copyright'
        ];
        const unset: any = {};
        this.schema.eachPath((path: string) => {
            if (paths4set.indexOf(path) < 0) {
                unset[path] = '';
            }
        });

        doc.update(
            { $unset: unset },
            // (err, raw) => {
            () => {
                // 仮に失敗したとしても気にしない
            }
        );
    }
});

schema.index(
    {
        performance: 1,
        seat_code: 1
    },
    {
        unique: true
    }
);

export const model = mongoose.model('Reservation', schema);
