// tslint:disable:no-invalid-this no-magic-numbers space-before-function-paren
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import * as PerformanceUtil from '../../util/performance';
import Film from './film';
import Screen from './screen';
import Theater from './theater';
import TicketTypeGroup from './ticketTypeGroup';

const DEFAULT_RADIX = 10;

/**
 * パフォーマンススキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        theater: { // 劇場ID
            type: String,
            ref: Theater.modelName
        },
        theater_name: {
            ja: String,
            en: String
        },
        screen: { // スクリーンID
            type: String,
            ref: Screen.modelName
        },
        screen_name: {
            ja: String,
            en: String
        },
        film: { // 作品ID
            type: String,
            ref: Film.modelName
        },
        ticket_type_group: { // 券種グループID
            type: String,
            ref: TicketTypeGroup.modelName
        },
        day: String, // 上映日
        open_time: String, // 開演時刻
        start_time: String, // 上映開始時刻
        end_time: String, // 上映終了時刻
        canceled: Boolean // 上映中止フラグ
    },
    {
        collection: 'performances',
        id: true,
        read: 'primaryPreferred',
        safe: <any>{ j: 1, w: 'majority', wtimeout: 10000 },
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

/**
 * 開始文字列を表示形式で取得
 */
schema.virtual('start_str_ja').get(function (this: any) {
    return `${this.day.substr(0, 4)}/${this.day.substr(4, 2)}/${this.day.substr(6)} ` +
        `開場 ${this.open_time.substr(0, 2)}:${this.open_time.substr(2)} 開演 ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)}`;
});
schema.virtual('start_str_en').get(function (this: any) {
    const date = `${moment(`${this.day.substr(0, 4)}-${this.day.substr(4, 2)}-` +
        `${this.day.substr(6)}T00:00:00+09:00`).format('MMMM DD, YYYY')}`;
    return `Open: ${this.open_time.substr(0, 2)}:${this.open_time.substr(2)}/` +
        `Start: ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)} ` +
        `on ${date}`;
});
schema.virtual('location_str_ja').get(function (this: any) {
    return `${this.get('theater_name').ja} ${this.get('screen_name').ja}`;
});
schema.virtual('location_str_en').get(function (this: any) {
    return `at ${this.get('screen_name').en}, ${this.get('theater_name').en}`;
});

/**
 * 空席ステータスを算出する
 *
 * @param {string} reservationNumber 予約数
 */
schema.methods.getSeatStatus = function (this: any, reservationNumber: number) {
    // 上映日当日過ぎていればG
    if (parseInt(this.day, DEFAULT_RADIX) < parseInt(moment().format('YYYYMMDD'), DEFAULT_RADIX)) {
        return PerformanceUtil.SEAT_STATUS_G;
    }

    // 残席0以下なら問答無用に×
    const availableSeatNum = this.screen.seats_number - reservationNumber;
    if (availableSeatNum <= 0) {
        return PerformanceUtil.SEAT_STATUS_C;
    }

    // 残席数よりステータスを算出
    const seatNum = 100 * availableSeatNum;
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_A * this.screen.seats_number < seatNum) {
        return PerformanceUtil.SEAT_STATUS_A;
    }
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_B * this.screen.seats_number < seatNum) {
        return PerformanceUtil.SEAT_STATUS_B;
    }

    return PerformanceUtil.SEAT_STATUS_C;
};

schema.index(
    {
        day: 1,
        start_time: 1
    }
);

export default mongoose.model('Performance', schema);
