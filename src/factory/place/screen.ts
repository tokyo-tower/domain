/**
 * スクリーンファクトリー
 * @namespace factory.place.screen
 */

export enum SeatGrade {
    /**
     * ノーマルシート
     */
    Normal = '00',
    /**
     * プレミアボックスシート
     */
    PremiereBox = '01',
    /**
     * プレミアラグジュアリーシート
     */
    PremiereLuxury = '02',
    /**
     * フロントリクライニングシート
     */
    FrontReclining = '03'
}

/**
 * 座席コードのソート関数
 * @function
 * @param {string} a 座席コード
 * @param {string} b 座席コード
 */
export function sortBySeatCode(a: string, b: string): number {
    const hyphenIndexA = a.lastIndexOf('-');
    const hyphenIndexB = b.lastIndexOf('-');
    const rowA = a.substr(0, hyphenIndexA); // 行
    const rowB = b.substr(0, hyphenIndexB); // 行
    const columnA = a.substr(hyphenIndexA + 1); // 列
    const columnB = b.substr(hyphenIndexB + 1); // 列

    if (rowA < rowB) {
        return -1; // 行は文字列比較
    } else if (rowA > rowB) {
        return 1; // 行は文字列比較
        // tslint:disable-next-line:no-magic-numbers
    } else if (parseInt(columnA, 10) < parseInt(columnB, 10)) {
        return -1; // 列は数値比較
    }

    return 1;
}
