export default class ReservationUtil {
    static STATUS_TEMPORARY: string;
    static STATUS_TEMPORARY_ON_KEPT_BY_TTTS: string;
    static STATUS_WAITING_SETTLEMENT: string;
    static STATUS_WAITING_SETTLEMENT_PAY_DESIGN: string;
    static STATUS_KEPT_BY_TTTS: string;
    static STATUS_KEPT_BY_MEMBER: string;
    static STATUS_RESERVED: string;
    static PURCHASER_GROUP_CUSTOMER: string;
    static PURCHASER_GROUP_MEMBER: string;
    static PURCHASER_GROUP_SPONSOR: string;
    static PURCHASER_GROUP_STAFF: string;
    static PURCHASER_GROUP_TEL: string;
    static PURCHASER_GROUP_WINDOW: string;
    static CHARGE_MX4D: number;
    static CHARGE_CVS: number;
    static publishPaymentNo(cb: (err: Error, no: string | null) => void): void;
    static getCheckDigit(source: string): number;
    static getCheckDigit2(source: string): number;
    static isValidPaymentNo(paymentNo: string): boolean;
    static decodePaymentNo(paymentNo: string): string;
    static CHECK_DIGIT_WEIGHTS: number[];
    static SORT_TYPES_PAYMENT_NO: number[][];
}
