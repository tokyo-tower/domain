"use strict";
class ScreenUtil {
    static sortBySeatCode(a, b) {
        let hyphenIndexA = a.lastIndexOf('-');
        let hyphenIndexB = b.lastIndexOf('-');
        let rowA = a.substr(0, hyphenIndexA);
        let rowB = b.substr(0, hyphenIndexB);
        let columnA = a.substr(hyphenIndexA + 1);
        let columnB = b.substr(hyphenIndexB + 1);
        if (rowA < rowB)
            return -1;
        if (rowA > rowB)
            return 1;
        if (parseInt(columnA) < parseInt(columnB))
            return -1;
        return 1;
    }
}
ScreenUtil.SEAT_GRADE_CODE_NORMAL = '00';
ScreenUtil.SEAT_GRADE_CODE_PREMIERE_BOX = '01';
ScreenUtil.SEAT_GRADE_CODE_PREMIERE_LUXURY = '02';
ScreenUtil.SEAT_GRADE_CODE_FRONT_RECLINING = '03';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenUtil;
