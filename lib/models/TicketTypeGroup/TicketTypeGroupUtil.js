"use strict";
const TicketTypeGroupUtil = require("../TicketTypeGroup/TicketTypeGroupUtil");
exports.TICKET_TYPE_CODE_ADULTS = '01';
exports.TICKET_TYPE_CODE_STUDENTS = '02';
exports.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = '03';
exports.TICKET_TYPE_CODE_FREE = '00';
exports.TICKET_TYPE_CODE_NOT_FOR_SALE = '99';
function getOne4staff() {
    return [
        {
            code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
            name: {
                ja: 'Not for sale',
                en: 'Not for Sale'
            },
            charge: 0
        },
        {
            code: TicketTypeGroupUtil.TICKET_TYPE_CODE_FREE,
            name: {
                ja: '無料',
                en: 'Free'
            },
            charge: 0
        }
    ];
}
exports.getOne4staff = getOne4staff;
function getOne4sponsor() {
    return [
        {
            code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
            name: {
                ja: 'Not for sale',
                en: 'Not for Sale'
            },
            charge: 0
        }
    ];
}
exports.getOne4sponsor = getOne4sponsor;
