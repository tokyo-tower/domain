export default class ScreenUtil {
    /** ノーマルシート */
    public static SEAT_GRADE_CODE_NORMAL = '00';
    /** プレミアボックスシート */
    public static SEAT_GRADE_CODE_PREMIERE_BOX = '01';
    /** プレミアラグジュアリーシート */
    public static SEAT_GRADE_CODE_PREMIERE_LUXURY = '02';
    /** フロントリクライニングシート */
    public static SEAT_GRADE_CODE_FRONT_RECLINING = '03';

    /**
     * 座席コードのソート関数
     * 
     * @param {string} a 座席コード
     * @param {string} b 座席コード
     */
    public static sortBySeatCode(a: string, b:string): number {
        let hyphenIndexA = a.lastIndexOf('-');
        let hyphenIndexB = b.lastIndexOf('-');
        let rowA = a.substr(0, hyphenIndexA); // 行
        let rowB = b.substr(0, hyphenIndexB); // 行
        let columnA = a.substr(hyphenIndexA + 1); // 列
        let columnB = b.substr(hyphenIndexB + 1); // 列

        if (rowA < rowB) return -1; // 行は文字列比較
        if (rowA > rowB) return 1; // 行は文字列比較
        if (parseInt(columnA) < parseInt(columnB)) return -1; // 列は数値比較
        return 1;
    }
}
