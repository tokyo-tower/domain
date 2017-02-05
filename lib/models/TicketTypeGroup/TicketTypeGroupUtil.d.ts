export default class TicketTypeGroupUtil {
    static TICKET_TYPE_CODE_ADULTS: string;
    static TICKET_TYPE_CODE_STUDENTS: string;
    static TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY: string;
    static TICKET_TYPE_CODE_FREE: string;
    static TICKET_TYPE_CODE_NOT_FOR_SALE: string;
    static getOne4staff(): {
        code: string;
        name: {
            ja: string;
            en: string;
        };
        charge: number;
    }[];
    static getOne4sponsor(): {
        code: string;
        name: {
            ja: string;
            en: string;
        };
        charge: number;
    }[];
}
