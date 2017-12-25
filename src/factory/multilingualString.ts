/**
 * 多言語文字列ファクトリー
 * @namespace factory.multilingualString
 */

/**
 * 多言語文字列
 * @interface
 * @memberof factory.multilingualString
 */
export interface IMultilingualString {
    ja: string;
    en: string;
    'zh-hant': string;
    'zh-hans': string;
    ko: string;
    th: string;
    id: string;
    vi: string;
    fr: string;
    de: string;
    it: string;
    es: string;
    ru: string;
}

/**
 * 英語と日本語対応文字列
 * @interface
 * @memberof factory.multilingualString
 */
export interface IBilingualString {
    ja: string;
    en: string;
}
