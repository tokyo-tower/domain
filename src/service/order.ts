/**
 * 注文サービス
 * @namespace service.order
 */

import * as GMO from '@motionpicture/gmo-service';

import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as StockRepo } from '../repo/stock';

import ReservationStatusType from '../factory/reservationStatusType';
import * as PlaceOrderTransactionFactory from '../factory/transaction/placeOrder';

export function processReturn(transaction: PlaceOrderTransactionFactory.ITransaction, cancellationFee: number) {
    return async (reservationRepo: ReservationRepo, stockRepo: StockRepo) => {
        const transactionResult = <PlaceOrderTransactionFactory.IResult>transaction.result;

        // 取引に対するクレジットカード承認アクションを取得
        const orderId = transactionResult.gmoOrderId;

        // 取引状態参照
        const searchTradeResult = await GMO.services.credit.searchTrade({
            shopId: <string>process.env.GMO_SHOP_ID,
            shopPass: <string>process.env.GMO_SHOP_PASS,
            orderId: orderId
        });

        if (searchTradeResult.jobCd !== GMO.utils.util.JobCd.Capture) {
            // 金額変更(エラー時はchangeTran内部で例外発生)
            await GMO.services.credit.changeTran({
                shopId: <string>process.env.GMO_SHOP_ID,
                shopPass: <string>process.env.GMO_SHOP_PASS,
                accessId: searchTradeResult.accessId,
                accessPass: searchTradeResult.accessPass,
                jobCd: GMO.utils.util.JobCd.Capture,
                amount: cancellationFee
            });
        }

        await Promise.all(transactionResult.eventReservations.map(async (reservation) => {
            // 2017/11 本体チケットかつ特殊チケットの時、時間ごとの予約データ解放(AVAILABLEに変更)
            // tslint:disable-next-line:no-suspicious-comment
            // TODO
            // if (reservation.ticket_ttts_extension.category !== ttts.TicketTypeGroupUtil.TICKET_TYPE_CATEGORY_NORMAL &&
            //     reservation.seat_code === reservation.reservation_ttts_extension.seat_code_base) {
            //     await ttts.Models.ReservationPerHour.findOneAndUpdate(
            //         { reservation_id: reservation._id.toString() },
            //         {
            //             $set: { status: ttts.factory.itemAvailability.InStock },
            //             $unset: { expired_at: 1, reservation_id: 1 }
            //         },
            //         { new: true }
            //     ).exec();
            // }

            // 予約データ解放(AVAILABLEに変更)
            await reservationRepo.reservationModel.findOneAndUpdate(
                { qr_str: reservation.qr_str },
                { status: ReservationStatusType.ReservationCancelled }
            ).exec();

            // 在庫を空きに(在庫IDに対して、元の状態に戻す)
            await stockRepo.stockModel.findOneAndUpdate(
                {
                    _id: reservation.stock,
                    availability: reservation.stock_availability_after,
                    holder: transaction.id // 対象取引に保持されている
                },
                {
                    $set: { availability: reservation.stock_availability_before },
                    $unset: { holder: 1 }
                }
            ).exec();
        }));

        // キャンセルメール送信
        // tslint:disable-next-line:no-suspicious-comment
        // TODO
        // await sendEmail(reservations[0].purchaser_email, getCancelMail(req, reservations, cancellationFee));
    };
}
