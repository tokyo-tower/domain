// tslint:disable:no-magic-numbers

/**
 * 座席予約ユーティリティ
 *
 * @namespace ReservationUtil
 */

import * as ReservationUtil from '../Reservation/ReservationUtil';
import { model as Sequence } from '../Sequence/SequenceModel';

const DEFAULT_RADIX = 10;

/**
 * 仮予約
 */
export const STATUS_TEMPORARY = 'TEMPORARY';
/**
 * TTTS確保上の仮予約
 */
export const STATUS_TEMPORARY_ON_KEPT_BY_TTTS = 'TEMPORARY_ON_KEPT_BY_TTTS';
/**
 * 決済待ち
 */
export const STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT';
/**
 * ペイデザイン決済待ち
 */
export const STATUS_WAITING_SETTLEMENT_PAY_DESIGN = 'WAITING_SETTLEMENT_PAY_DESIGN';
/**
 * TTTS確保
 */
export const STATUS_KEPT_BY_TTTS = 'KEPT_BY_TTTS';
/**
 * メルマガ会員保留
 */
export const STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER';
/**
 * 予約確定
 */
export const STATUS_RESERVED = 'RESERVED';

/**
 * 一般
 */
export const PURCHASER_GROUP_CUSTOMER = '01';
/**
 * メルマガ会員先行
 */
export const PURCHASER_GROUP_MEMBER = '02';
/**
 * 外部関係者
 */
export const PURCHASER_GROUP_SPONSOR = '03';
/**
 * 内部関係者
 */
export const PURCHASER_GROUP_STAFF = '04';
/**
 * 電話
 */
export const PURCHASER_GROUP_TEL = '05';
/**
 * 窓口
 */
export const PURCHASER_GROUP_WINDOW = '06';

/**
 * MX4D追加料金
 */
export const CHARGE_MX4D = 1200;
/**
 * コンビニ決済手数料
 */
export const CHARGE_CVS = 150;

export const CHECK_DIGIT_WEIGHTS = [2, 6, 3, 4, 3, 7, 5, 4, 2];

export const SORT_TYPES_PAYMENT_NO = [
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

/**
 * 購入管理番号生成
 */
export function publishPaymentNo(cb: (err: Error, no: string | null) => void): void {
    Sequence.findOneAndUpdate(
        { target: 'payment_no' },
        {
            $inc: { no: 1 }
        },
        {
            upsert: true, // 初めての購入連番発行であれば1をセットする
            new: true
        },
        (err, sequence) => {
            if (err) {
                return cb(err, null);
            }

            const no: number = sequence.get('no');

            // 9桁になるように0で埋める
            let source = no.toString();
            while (source.length < 9) {
                source = '0' + source;
            }
            const checKDigit = ReservationUtil.getCheckDigit(source);
            const checKDigit2 = ReservationUtil.getCheckDigit2(source);

            // sortTypes[checkDigit]で並べ替える
            const sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checKDigit];
            const paymentNo = checKDigit2.toString() + sortType.map((index) => source.substr(index, 1)).join('') + checKDigit.toString();
            cb(err, paymentNo);
        }
    );
}

/**
 * チェックディジットを求める
 *
 * @param {string} source
 */
export function getCheckDigit(source: string): number {
    if (source.length !== 9) {
        throw new Error('source length must be 9.');
    }

    let sum = 0;
    source.split('').reverse().forEach((digitNumber, index) => {
        sum += parseInt(digitNumber, DEFAULT_RADIX) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
    });
    const checkDigit = 11 - (sum % 11);

    // 2桁の場合0、1桁であればそのまま(必ず1桁になるように)
    return (checkDigit >= 10) ? 0 : checkDigit;
}

/**
 * チェックディジットを求める2
 *
 * @param {string} source
 */
export function getCheckDigit2(source: string): number {
    if (source.length !== 9) {
        throw new Error('source length must be 9.');
    }

    let sum = 0;
    source.split('').reverse().forEach((digitNumber, index) => {
        sum += parseInt(digitNumber, DEFAULT_RADIX) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
    });

    return 9 - (sum % 9);
}

/**
 * 購入番号の有効性をチェックする
 *
 * @param {string} paymentNo
 */
export function isValidPaymentNo(paymentNo: string): boolean {
    if (paymentNo.length !== 11) {
        return false;
    }

    const sequeceNo = ReservationUtil.decodePaymentNo(paymentNo);
    const checkDigit = ReservationUtil.getCheckDigit(sequeceNo);
    const checkDigit2 = ReservationUtil.getCheckDigit2(sequeceNo);

    return (
        parseInt(paymentNo.substr(-1), DEFAULT_RADIX) === checkDigit &&
        parseInt(paymentNo.substr(0, 1), DEFAULT_RADIX) === checkDigit2
    );
}

export function decodePaymentNo(paymentNo: string): string {
    const checkDigit = parseInt(paymentNo.substr(-1), DEFAULT_RADIX);
    const strs = paymentNo.substr(1, paymentNo.length - 2);
    const sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checkDigit];

    return sortType.map((weightNumber) => {
        return strs.substr(weightNumber, 1);
    }).join();
}
