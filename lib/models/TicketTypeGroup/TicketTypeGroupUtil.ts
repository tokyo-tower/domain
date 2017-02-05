export default class TicketTypeGroupUtil {
    /** 券種(一般) */
    public static TICKET_TYPE_CODE_ADULTS = '01';
    /** 券種(学生) */
    public static TICKET_TYPE_CODE_STUDENTS = '02';
    /** 券種(学生当日) */
    public static TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = '03';
    /** 券種(無料) */
    public static TICKET_TYPE_CODE_FREE= '00';
    /** 券種(Not for sale) */
    public static TICKET_TYPE_CODE_NOT_FOR_SALE= '99';

    /**
     * 内部関係者用券種グループを取得する
     */
    public static getOne4staff() {
        return [
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
                name: {
                    ja: 'Not for sale',
                    en: 'Not for Sale'
                },
                charge: 0 // 料金
            },
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_FREE,
                name: {
                    ja: '無料',
                    en: 'Free'
                },
                charge: 0 // 料金
            }
        ];
    }

    /**
     * 外部関係者用券種グループを取得する
     */
    public static getOne4sponsor() {
        return [
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
                name: {
                    ja: 'Not for sale',
                    en: 'Not for Sale'
                },
                charge: 0 // 料金
            }
        ];
    }
}
