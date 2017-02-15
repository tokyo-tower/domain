"use strict";
const mongoose = require("mongoose");
const PerformanceUtil = require("./PerformanceUtil");
const moment = require("moment");
const FilmModel_1 = require("../Film/FilmModel");
const ScreenModel_1 = require("../Screen/ScreenModel");
const TheaterModel_1 = require("../Theater/TheaterModel");
const schema = new mongoose.Schema({
    _id: String,
    theater: {
        type: String,
        ref: TheaterModel_1.default.modelName
    },
    theater_name: {
        ja: String,
        en: String
    },
    screen: {
        type: String,
        ref: ScreenModel_1.default.modelName
    },
    screen_name: {
        ja: String,
        en: String
    },
    film: {
        type: String,
        ref: FilmModel_1.default.modelName
    },
    day: String,
    open_time: String,
    start_time: String,
    end_time: String,
    canceled: Boolean
}, {
    collection: 'performances',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});
schema.virtual('start_str_ja').get(function () {
    return `${this.day.substr(0, 4)}/${this.day.substr(4, 2)}/${this.day.substr(6)} 開場 ${this.open_time.substr(0, 2)}:${this.open_time.substr(2)} 開演 ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)}`;
});
schema.virtual('start_str_en').get(function () {
    const date = `${moment(`${this.day.substr(0, 4)}-${this.day.substr(4, 2)}-${this.day.substr(6)}T00:00:00+09:00`).format('MMMM DD, YYYY')}`;
    return `Open: ${this.open_time.substr(0, 2)}:${this.open_time.substr(2)}/Start: ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)} on ${date}`;
});
schema.virtual('location_str_ja').get(function () {
    return `${this.get('theater_name')['ja']} ${this.get('screen_name')['ja']}`;
});
schema.virtual('location_str_en').get(function () {
    return `at ${this.get('screen_name')['en']}, ${this.get('theater_name')['en']}`;
});
schema.methods.getSeatStatus = function (reservationNumber) {
    if (parseInt(this.day) < parseInt(moment().format('YYYYMMDD')))
        return PerformanceUtil.SEAT_STATUS_G;
    const availableSeatNum = this.screen.seats_number - reservationNumber;
    if (availableSeatNum <= 0)
        return PerformanceUtil.SEAT_STATUS_C;
    const seatNum = 100 * availableSeatNum;
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_A * this.screen.seats_number < seatNum)
        return PerformanceUtil.SEAT_STATUS_A;
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_B * this.screen.seats_number < seatNum)
        return PerformanceUtil.SEAT_STATUS_B;
    return PerformanceUtil.SEAT_STATUS_C;
};
schema.index({
    day: 1,
    start_time: 1
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mongoose.model('Performance', schema);
