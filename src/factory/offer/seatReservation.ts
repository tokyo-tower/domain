/**
 * 座席予約供給情報ファクトリー
 * @namespace offer.seatReservation
 */

import IMultilingualString from '../multilingualString';
import * as OfferFactory from '../offer';
import { IExtension as IExtensionPerformance } from '../performance';
import { IExtensionTicketType, ITicketCancelCharge } from '../reservation/event';

export interface ICOATicketInfo {
    /**
     * チケットコード
     */
    ticketCode: string;
    /**
     * ムビチケ計上単価
     * ムビチケの場合、計上単価（興収報告単価）をセット（ムビチケ以外は0をセット）
     */
    mvtkAppPrice: number;
    /**
     * 枚数
     */
    ticketCount: number;
    /**
     * メガネ単価
     * メガネ代が別途発生した場合は、メガネ代をセット。それ以外は０をセット（ムビチケの場合も同様）
     */
    addGlasses: number;
    /**
     * ムビチケ映写方式区分
     * ムビチケ連携情報より
     */
    kbnEisyahousiki: string;
    /**
     * ムビチケ購入管理番号
     * ムビチケ連携情報より（ムビチケ以外は""）
     */
    mvtkNum: string;
    /**
     * ムビチケ電子券区分
     * ムビチケ連携情報より（01：電子、02：紙　※ムビチケ以外は"00"をセット）
     */
    mvtkKbnDenshiken: string;
    /**
     * ムビチケ前売券区分
     * ムビチケ連携情報より（01：全国券、02：劇場券　※ムビチケ以外は"00"をセット）
     */
    mvtkKbnMaeuriken: string;
    /**
     * ムビチケ券種区分
     * ムビチケ連携情報より（01：一般2Ｄ、02：小人2Ｄ、03：一般3Ｄ、…　※ムビチケ以外は"00"をセット）
     */
    mvtkKbnKensyu: string;
    /**
     * ムビチケ販売単価
     * ムビチケ連携情報より（ムビチケ以外は0をセット）
     */
    mvtkSalesPrice: number;
}

/**
 * COA券種情報
 * @export
 * @interface
 * @memberof offer.seatReservation
 */
export interface ICOATicketInfoWithDetails {
    /**
     * チケット名
     */
    ticketName: string;
    /**
     * チケット名（カナ）
     */
    ticketNameKana: string;
    /**
     * チケット名（英）
     */
    ticketNameEng: string;
}

/**
 * 座席予約供給情報インターフェース
 * @export
 * @interface
 * @memberof offer.seatReservation
 */
export interface IOffer {
    extra: {
        ticket_type: string;
        ticketCount: number;
        updated: boolean;
    }[]; // 車いすの場合
    status: string;
    ticket_type: string;
    ticket_type_name: IMultilingualString;
    ticket_type_charge: number;
    watcher_name: string;
    ticket_cancel_charge: ITicketCancelCharge[];
    ticket_ttts_extension: IExtensionTicketType;
    performance_ttts_extension: IExtensionPerformance;
}

/**
 * 座席予約供給情報(詳細つき)インターフェース
 * @export
 * @interface
 * @memberof offer.seatReservation
 */
export interface IOfferWithDetails extends OfferFactory.IOffer {
    extra: {
        ticket_type: string;
        ticketCount: number;
        updated: boolean;
    }[]; // 車いすの場合
    status: string;
    seat_grade_name: {
        en: string;
        ja: string;
    }; // 東京タワーの場合座席グレードは実質ない?
    seat_grade_additional_charge: number; // 東京タワーの場合座席グレードは実質ない?
    ticket_type: string;
    ticket_type_name: IMultilingualString;
    ticket_type_charge: number;
    watcher_name: string;
    ticket_cancel_charge: ITicketCancelCharge[];
    ticket_ttts_extension: IExtensionTicketType;
    performance_ttts_extension: IExtensionPerformance;
}
