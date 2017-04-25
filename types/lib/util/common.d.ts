export interface IPrefecture {
    code: string;
    name: {
        ja: string;
        en: string;
    };
}
/**
 * ミリ秒とプロセスに対してユニークなトークンを生成する
 * todo uniqidの型定義なし
 *
 * @memberOf CommonUtil
 */
export declare function createToken(): string;
/**
 * ハッシュ値を作成する
 *
 * @param {string} password
 * @param {string} salt
 * @memberOf CommonUtil
 */
export declare function createHash(password: string, salt: string): string;
/**
 * 全角→半角変換
 *
 * @memberOf CommonUtil
 */
export declare function toHalfWidth(str: string): string;
/**
 * 半角→全角変換
 *
 * @memberOf CommonUtil
 */
export declare function toFullWidth(str: string): string;
/**
 * 都道府県リスト
 *
 * @memberOf CommonUtil
 */
export declare function getPrefectrues(): IPrefecture[];
