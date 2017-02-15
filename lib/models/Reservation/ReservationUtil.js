"use strict";
const ReservationUtil = require("../Reservation/ReservationUtil");
const SequenceModel_1 = require("../Sequence/SequenceModel");
const DEFAULT_RADIX = 10;
exports.STATUS_TEMPORARY = 'TEMPORARY';
exports.STATUS_TEMPORARY_ON_KEPT_BY_TTTS = 'TEMPORARY_ON_KEPT_BY_TTTS';
exports.STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT';
exports.STATUS_WAITING_SETTLEMENT_PAY_DESIGN = 'WAITING_SETTLEMENT_PAY_DESIGN';
exports.STATUS_KEPT_BY_TTTS = 'KEPT_BY_TTTS';
exports.STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER';
exports.STATUS_RESERVED = 'RESERVED';
exports.PURCHASER_GROUP_CUSTOMER = '01';
exports.PURCHASER_GROUP_MEMBER = '02';
exports.PURCHASER_GROUP_SPONSOR = '03';
exports.PURCHASER_GROUP_STAFF = '04';
exports.PURCHASER_GROUP_TEL = '05';
exports.PURCHASER_GROUP_WINDOW = '06';
exports.CHARGE_MX4D = 1200;
exports.CHARGE_CVS = 150;
function publishPaymentNo(cb) {
    SequenceModel_1.default.findOneAndUpdate({ target: 'payment_no' }, {
        $inc: { no: 1 }
    }, {
        upsert: true,
        new: true
    }, (err, sequence) => {
        if (err)
            return cb(err, null);
        const no = sequence.get('no');
        let source = no.toString();
        while (source.length < 9) {
            source = '0' + source;
        }
        const checKDigit = ReservationUtil.getCheckDigit(source);
        const checKDigit2 = ReservationUtil.getCheckDigit2(source);
        const sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checKDigit];
        const paymentNo = checKDigit2.toString() + sortType.map((index) => source.substr(index, 1)).join('') + checKDigit.toString();
        cb(err, paymentNo);
    });
}
exports.publishPaymentNo = publishPaymentNo;
function getCheckDigit(source) {
    if (source.length !== 9)
        throw new Error('source length must be 9.');
    let sum = 0;
    source.split('').reverse().forEach((digitNumber, index) => {
        sum += parseInt(digitNumber, DEFAULT_RADIX) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
    });
    const checkDigit = 11 - (sum % 11);
    return (checkDigit >= 10) ? 0 : checkDigit;
}
exports.getCheckDigit = getCheckDigit;
function getCheckDigit2(source) {
    if (source.length !== 9)
        throw new Error('source length must be 9.');
    let sum = 0;
    source.split('').reverse().forEach((digitNumber, index) => {
        sum += parseInt(digitNumber, DEFAULT_RADIX) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
    });
    const checkDigit = 9 - (sum % 9);
    return checkDigit;
}
exports.getCheckDigit2 = getCheckDigit2;
function isValidPaymentNo(paymentNo) {
    if (paymentNo.length !== 11)
        return false;
    const sequeceNo = ReservationUtil.decodePaymentNo(paymentNo);
    const checkDigit = ReservationUtil.getCheckDigit(sequeceNo);
    const checkDigit2 = ReservationUtil.getCheckDigit2(sequeceNo);
    return (parseInt(paymentNo.substr(-1), DEFAULT_RADIX) === checkDigit && parseInt(paymentNo.substr(0, 1)) === checkDigit2);
}
exports.isValidPaymentNo = isValidPaymentNo;
function decodePaymentNo(paymentNo) {
    const checkDigit = parseInt(paymentNo.substr(-1), DEFAULT_RADIX);
    const strs = paymentNo.substr(1, paymentNo.length - 2);
    const sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checkDigit];
    let sequeceNo = '';
    for (let i = 0; i < 9; i++) {
        sequeceNo += strs.substr(sortType.indexOf(i), 1);
    }
    return sequeceNo;
}
exports.decodePaymentNo = decodePaymentNo;
exports.CHECK_DIGIT_WEIGHTS = [2, 6, 3, 4, 3, 7, 5, 4, 2];
exports.SORT_TYPES_PAYMENT_NO = [
    [5, 0, 2, 3, 7, 6, 1, 8, 4],
    [7, 6, 1, 0, 4, 8, 3, 5, 2],
    [3, 2, 8, 4, 1, 0, 5, 7, 6],
    [0, 1, 3, 8, 7, 2, 6, 5, 4],
    [8, 2, 5, 0, 6, 1, 4, 7, 3],
    [1, 8, 5, 4, 0, 7, 3, 2, 6],
    [2, 3, 8, 6, 5, 7, 1, 0, 4],
    [4, 0, 8, 5, 6, 2, 7, 1, 3],
    [6, 4, 7, 8, 5, 2, 3, 0, 1],
    [7, 2, 4, 8, 0, 3, 5, 6, 1]
];
