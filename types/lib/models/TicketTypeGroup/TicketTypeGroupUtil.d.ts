export declare const TICKET_TYPE_CODE_ADULTS = "01";
export declare const TICKET_TYPE_CODE_STUDENTS = "02";
export declare const TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = "03";
export declare const TICKET_TYPE_CODE_FREE = "00";
export declare const TICKET_TYPE_CODE_NOT_FOR_SALE = "99";
export declare function getOne4staff(): {
    code: string;
    name: {
        ja: string;
        en: string;
    };
    charge: number;
}[];
export declare function getOne4sponsor(): {
    code: string;
    name: {
        ja: string;
        en: string;
    };
    charge: number;
}[];
