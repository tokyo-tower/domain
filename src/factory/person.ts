/**
 * person factory
 * 人物ファクトリー
 * @namespace person
 */

export enum Group {
    /**
     * 一般
     */
    Customer = '01',
    /**
     * 内部関係者
     */
    Staff = '04'
}

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
     * id
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
    group?: Group;
    signature?: string;
}
