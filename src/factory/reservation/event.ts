/**
 * イベント予約ファクトリー
 * @namespace reservation.event
 */

import PaymentMethodType from '../paymentMethodType';
import * as PerformanceFactory from '../performance';
import * as ReservationFactory from '../reservation';

import ItemAvailability from '../itemAvailability';
import IMultilingualString from '../multilingualString';

/**
 * tttsExtensionReservation.ts
 * ttts拡張予予約情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
export interface IExtensionReservation {
    // 本体の座席番号 (余分確保チケットと予約本体のチケットを結びつけるためのフィールド)
    seat_code_base: string;
    // // 一括返金ステータス
    // refund_status: {
    //     type: String,
    //     required: false
    // },
    // // 一括返金ステータス変更者
    // refund_update_user: {
    //     type: String,
    //     required: false
    // },
    // // 一括返金ステータス更新日時
    // refund_update__at: {
    //     type: String,
    //     required: false
    // }
}

/**
 * ticketCancelCharge.ts
 * キャンセル料mongooseスキーマタイプ
 */
export interface ITicketCancelCharge {
    // 予約日までの日数
    days: number;
    // キャンセル料
    charge: number;
}

/**
 * tttsExtensionTicketType.ts
 * ttts拡張・チケット情報mongooseスキーマタイプ
 * ttts独自の機能拡張用フィールド定義
 */
export interface IExtensionTicketType {
    // 種別 ('0':通常 '1':車椅子)
    category: string;
    // 必要な座席数(通常:1 車椅子:4)
    required_seat_num: number;
    // csv出力用コード
    csv_code: string;
}

export interface IReservation extends ReservationFactory.IReservation {
    id?: string;
    /**
     * おさえた在庫ID
     */
    stock: string;
    /**
     * 仮予約前の在庫ステータス
     */
    stock_availability_before: ItemAvailability;
    qr_str: string;
    performance: string;
    seat_code: string;
    reservation_ttts_extension: IExtensionReservation;

    performance_day: string;
    performance_open_time: string;
    performance_start_time: string;
    performance_end_time: string;
    performance_canceled: boolean;
    performance_ttts_extension: PerformanceFactory.IExtension;

    theater: string;
    theater_name: IMultilingualString;
    theater_address: IMultilingualString;

    screen: string;
    screen_name: IMultilingualString;

    film: string;
    film_name: IMultilingualString;
    film_image: string;
    film_is_mx4d: boolean;
    film_copyright: string;

    purchaser_group: string; // 購入者区分
    purchaser_last_name: string;
    purchaser_first_name: string;
    purchaser_email: string;
    purchaser_tel: string;
    purchaser_international_tel: string;
    purchaser_age: string; // 生まれた年代
    purchaser_address: string; // 住所
    purchaser_gender: string; // 性別

    payment_no: string; // 購入番号
    payment_seat_index: number; // 購入座席インデックス
    purchased_at: Date; // 購入確定日時
    payment_method: PaymentMethodType; // 決済方法

    seat_grade_name: {
        ja: string;
        en: string;
    };
    seat_grade_additional_charge: number;

    ticket_type: string; // 券種
    ticket_type_name: IMultilingualString;
    ticket_type_charge: number;
    ticket_cancel_charge: ITicketCancelCharge[];
    ticket_ttts_extension: IExtensionTicketType;

    watcher_name: string; // 配布先
    watcher_name_updated_at: Date; // 配布先更新日時 default: Date.now

    charge: number; // 座席単体の料金

    owner?: string; // オーナー
    owner_username?: string;
    owner_name?: {
        ja: string;
        en: string;
    };
    owner_email?: string;
    owner_group?: string;
    owner_signature?: string;

    checkins: {  // 入場履歴
        when: Date, // いつ
        where: string; // どこで
        why: string; // 何のために
        how: string; // どうやって
    }[];

    gmo_order_id: string; // GMOオーダーID
}

/**
 * 座席仮予約からイベント予約データを作成する
 * @export
 * @function
 * @memberof reservation.event
 */
// export function createFromCOATmpReserve(params: {
//     updTmpReserveSeatResult: COA.services.reserve.IUpdTmpReserveSeatResult;
//     offers: ISeatReservationOffer[],
//     individualScreeningEvent: IndividualScreeningEventFactory.IEvent
// }): IEventReservation<IndividualScreeningEventFactory.IEvent>[] {
//     return params.updTmpReserveSeatResult.listTmpReserve.map((tmpReserve, index) => {
//         const requestedOffer = params.offers.find((offer) => {
//             return (offer.seatNumber === tmpReserve.seatNum && offer.seatSection === tmpReserve.seatSection);
//         });
//         if (requestedOffer === undefined) {
//             throw new ArgumentError('offers', '要求された供給情報と仮予約結果が一致しません。');
//         }

//         // チケットトークン(QRコード文字列)を作成
//         const ticketToken = [
//             params.individualScreeningEvent.coaInfo.theaterCode,
//             params.individualScreeningEvent.coaInfo.dateJouei,
//             // tslint:disable-next-line:no-magic-numbers
//             (`00000000${params.updTmpReserveSeatResult.tmpReserveNum}`).slice(-8),
//             // tslint:disable-next-line:no-magic-numbers
//             (`000${index + 1}`).slice(-3)
//         ].join('');

//         const now = new Date();

//         return {
//             typeOf: ReservationType.EventReservation,
//             additionalTicketText: '',
//             modifiedTime: now,
//             numSeats: 1,
//             price: requestedOffer.price,
//             priceCurrency: requestedOffer.priceCurrency,
//             reservationFor: params.individualScreeningEvent,
//             reservationNumber: `${params.updTmpReserveSeatResult.tmpReserveNum}-${index.toString()}`,
//             reservationStatus: ReservationStatusType.ReservationHold,
//             reservedTicket: {
//                 typeOf: 'Ticket',
//                 coaTicketInfo: requestedOffer.ticketInfo,
//                 dateIssued: now,
//                 issuedBy: params.individualScreeningEvent.superEvent.organizer,
//                 totalPrice: requestedOffer.price,
//                 priceCurrency: requestedOffer.priceCurrency,
//                 ticketedSeat: {
//                     typeOf: PlaceType.Seat,
//                     seatingType: '',
//                     seatNumber: tmpReserve.seatNum,
//                     seatRow: '',
//                     seatSection: tmpReserve.seatSection
//                 },
//                 ticketNumber: ticketToken,
//                 ticketToken: ticketToken,
//                 underName: {
//                     typeOf: PersonType.Person,
//                     name: {
//                         ja: '',
//                         en: ''
//                     }
//                 }
//             },
//             underName: {
//                 typeOf: PersonType.Person,
//                 name: {
//                     ja: '',
//                     en: ''
//                 }
//             }
//         };
//     });
// }
