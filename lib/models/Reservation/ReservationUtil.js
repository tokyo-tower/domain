"use strict";
const Models_1 = require("../Models");
class ReservationUtil {
    static publishPaymentNo(cb) {
        Models_1.default.Sequence.findOneAndUpdate({ target: 'payment_no' }, {
            $inc: { no: 1 }
        }, {
            upsert: true,
            new: true
        }, (err, sequence) => {
            if (err)
                return cb(err, null);
            let no = sequence.get('no');
            let source = no.toString();
            while (source.length < 9) {
                source = '0' + source;
            }
            let checKDigit = ReservationUtil.getCheckDigit(source);
            let checKDigit2 = ReservationUtil.getCheckDigit2(source);
            let sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checKDigit];
            let paymentNo = checKDigit2.toString() + sortType.map((index) => { return source.substr(index, 1); }).join('') + checKDigit.toString();
            cb(err, paymentNo);
        });
    }
    static getCheckDigit(source) {
        if (source.length !== 9)
            throw new Error('source length must be 9.');
        let sum = 0;
        source.split('').reverse().forEach((digitNumber, index) => {
            sum += parseInt(digitNumber) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
        });
        let checkDigit = 11 - (sum % 11);
        return (checkDigit >= 10) ? 0 : checkDigit;
    }
    static getCheckDigit2(source) {
        if (source.length !== 9)
            throw new Error('source length must be 9.');
        let sum = 0;
        source.split('').reverse().forEach((digitNumber, index) => {
            sum += parseInt(digitNumber) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
        });
        let checkDigit = 9 - (sum % 9);
        return checkDigit;
    }
    static isValidPaymentNo(paymentNo) {
        if (paymentNo.length !== 11)
            return false;
        let sequeceNo = ReservationUtil.decodePaymentNo(paymentNo);
        let checkDigit = ReservationUtil.getCheckDigit(sequeceNo);
        let checkDigit2 = ReservationUtil.getCheckDigit2(sequeceNo);
        return (parseInt(paymentNo.substr(-1)) === checkDigit && parseInt(paymentNo.substr(0, 1)) === checkDigit2);
    }
    static decodePaymentNo(paymentNo) {
        let checkDigit = parseInt(paymentNo.substr(-1));
        let strs = paymentNo.substr(1, paymentNo.length - 2);
        let sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checkDigit];
        let sequeceNo = '';
        for (let i = 0; i < 9; i++) {
            sequeceNo += strs.substr(sortType.indexOf(i), 1);
        }
        return sequeceNo;
    }
}
ReservationUtil.STATUS_TEMPORARY = 'TEMPORARY';
ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TTTS = 'TEMPORARY_ON_KEPT_BY_TTTS';
ReservationUtil.STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT';
ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN = 'WAITING_SETTLEMENT_PAY_DESIGN';
ReservationUtil.STATUS_KEPT_BY_TTTS = 'KEPT_BY_TTTS';
ReservationUtil.STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER';
ReservationUtil.STATUS_RESERVED = 'RESERVED';
ReservationUtil.PURCHASER_GROUP_CUSTOMER = '01';
ReservationUtil.PURCHASER_GROUP_MEMBER = '02';
ReservationUtil.PURCHASER_GROUP_SPONSOR = '03';
ReservationUtil.PURCHASER_GROUP_STAFF = '04';
ReservationUtil.PURCHASER_GROUP_TEL = '05';
ReservationUtil.PURCHASER_GROUP_WINDOW = '06';
ReservationUtil.CHARGE_MX4D = 1200;
ReservationUtil.CHARGE_CVS = 150;
ReservationUtil.CHECK_DIGIT_WEIGHTS = [2, 6, 3, 4, 3, 7, 5, 4, 2];
ReservationUtil.SORT_TYPES_PAYMENT_NO = [
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationUtil;
