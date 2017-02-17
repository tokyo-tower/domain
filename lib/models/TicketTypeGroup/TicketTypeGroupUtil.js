/**
 * 券種ユーティリティ
 *
 * @namespace TicketTypeGroupUtil
 */
"use strict";
const TicketTypeGroupUtil = require("../TicketTypeGroup/TicketTypeGroupUtil");
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
exports.TICKET_TYPE_CODE_FREE = '00';
/**
 * 券種(Not for sale)
 */
exports.TICKET_TYPE_CODE_NOT_FOR_SALE = '99';
/**
 * 内部関係者用券種グループを取得する
 */
function getOne4staff() {
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
exports.getOne4staff = getOne4staff;
/**
 * 外部関係者用券種グループを取得する
 */
function getOne4sponsor() {
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
exports.getOne4sponsor = getOne4sponsor;
