/**
 * person factory
 * 人物ファクトリー
 * @namespace person
 */

/**
 * contact interface
 * 連絡先インターフェース
 * @export
 * @interface {IPerson}
 * @memberof person
 */
export interface IContact {
    last_name: string;
    first_name: string;
    email: string;
    tel: string;
    age: string;
    address: string;
    gender: string;
}

/**
 * person interface
 * 人物インターフェース
 * @export
 * @interface {IPerson}
 * @memberof person
 */
export interface IPerson {
    /**
     * person id (Amazon Cognito User Identifier)
     */
    id: string;
    /**
     * URL of the item.
     */
    url?: string;
    username?: string;
    name?: {
        en: string;
        ja: string;
    };
    notes?: string;
    email?: string;
    group?: string;
    signature?: string;
}
