/**
 * 座席予約供給情報ファクトリー
 * @namespace offer.seatReservation
 */

import IMultilingualString from '../multilingualString';
import * as OfferFactory from '../offer';
import { IExtensionTicketType, ITicketCancelCharge } from '../reservation/event';

/**
 * 座席予約供給情報インターフェース
 * @export
 * @interface
 * @memberof offer.seatReservation
 */
export interface IAcceptedOffer {
    ticket_type: string;
    watcher_name: string;
}

/**
 * 座席予約供給情報(詳細つき)インターフェース
 * @export
 * @interface
 * @memberof offer.seatReservation
 */
export interface IOffer extends OfferFactory.IOffer {
    ticket_type: string;
    ticket_type_name: IMultilingualString;
    ticket_type_charge: number;
    watcher_name: string;
    ticket_cancel_charge: ITicketCancelCharge[];
    ticket_ttts_extension: IExtensionTicketType;
    rate_limit_unit_in_seconds: number;
    // availability: any;
    // available_num: number;
}
