/**
 * 券種(一般)
 */
export declare const TICKET_TYPE_CODE_ADULTS = "01";
/**
 * 券種(学生)
 */
export declare const TICKET_TYPE_CODE_STUDENTS = "02";
/**
 * 券種(学生当日)
 */
export declare const TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = "03";
/**
 * 券種(無料)
 */
export declare const TICKET_TYPE_CODE_FREE = "FREE";
/**
 * 券種(Not for sale)
 */
export declare const TICKET_TYPE_CODE_NOT_FOR_SALE = "NOTFORSALE";
/**
 * 内部関係者用券種グループを取得する
 */
export declare function getOne4staff(): {
    _id: string;
    name: {
        ja: string;
        en: string;
    };
    charge: number;
}[];
