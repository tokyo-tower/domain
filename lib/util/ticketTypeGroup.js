"use strict";
/**
 * 券種ユーティリティ
 *
 * @namespace TicketTypeGroupUtil
 */
Object.defineProperty(exports, "__esModule", { value: true });
const TicketTypeGroupUtil = require("./ticketTypeGroup");
/**
 * 券種(一般)
 */
exports.TICKET_TYPE_CODE_ADULTS = '01';
/**
 * 券種(学生)
 */
exports.TICKET_TYPE_CODE_STUDENTS = '02';
/**
 * 券種(学生当日)
 */
exports.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = '03';
/**
 * 券種(無料)
 */
exports.TICKET_TYPE_CODE_FREE = 'FREE';
/**
 * 券種(Not for sale)
 */
exports.TICKET_TYPE_CODE_NOT_FOR_SALE = 'NOTFORSALE';
/**
 * 内部関係者用券種グループを取得する
 */
function getOne4staff() {
    return [
        {
            _id: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
            name: {
                ja: 'Not for sale',
                en: 'Not for Sale'
            },
            charge: 0 // 料金
        },
        {
            _id: TicketTypeGroupUtil.TICKET_TYPE_CODE_FREE,
            name: {
                ja: '無料',
                en: 'Free'
            },
            charge: 0 // 料金
        }
    ];
}
exports.getOne4staff = getOne4staff;
