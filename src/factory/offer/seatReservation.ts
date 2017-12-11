/**
 * 座席予約供給情報ファクトリー
 * @namespace offer.seatReservation
 */

import IMultilingualString from '../multilingualString';
import * as OfferFactory from '../offer';
import { IExtension as IExtensionPerformance } from '../performance';
import { IExtensionTicketType, ITicketCancelCharge } from '../reservation/event';

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
