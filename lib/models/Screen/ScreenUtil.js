"use strict";
const DEFAULT_RADIX = 10;
exports.SEAT_GRADE_CODE_NORMAL = '00';
exports.SEAT_GRADE_CODE_PREMIERE_BOX = '01';
exports.SEAT_GRADE_CODE_PREMIERE_LUXURY = '02';
exports.SEAT_GRADE_CODE_FRONT_RECLINING = '03';
function sortBySeatCode(a, b) {
    const hyphenIndexA = a.lastIndexOf('-');
    const hyphenIndexB = b.lastIndexOf('-');
    const rowA = a.substr(0, hyphenIndexA);
    const rowB = b.substr(0, hyphenIndexB);
    const columnA = a.substr(hyphenIndexA + 1);
    const columnB = b.substr(hyphenIndexB + 1);
    if (rowA < rowB)
        return -1;
    if (rowA > rowB)
        return 1;
    if (parseInt(columnA, DEFAULT_RADIX) < parseInt(columnB, DEFAULT_RADIX))
        return -1;
    return 1;
}
exports.sortBySeatCode = sortBySeatCode;
