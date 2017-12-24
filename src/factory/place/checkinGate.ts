/**
 * 入場ゲートファクトリー
 * @namespace factory.place.checkinGate
 */

/**
 * 入場ゲートインターフェース
 * @interface
 * @memberof factory.place.checkinGate
 */
export interface IPlace {
    /**
     * 識別子
     */
    identifier: string;
    /**
     * ゲート名
     */
    name: string;
}
