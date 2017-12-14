/**
 * 注文サービス
 * @namespace service.order
 */

import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';

import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as errors from '../factory/errors';
import ReservationStatusType from '../factory/reservationStatusType';
import * as PlaceOrderTransactionFactory from '../factory/transaction/placeOrder';
import { ITransaction as IReturnOrderTransaction } from '../factory/transaction/returnOrder';

const debug = createDebug('ttts-domain:service:order');

/**
 * 返品処理を実行する
 * リトライ可能なように実装すること
 * @param {IReturnOrderTransaction} returnOrderTransaction
 */
export function processReturn(returnOrderTransactionId: string) {
    return async (reservationRepo: ReservationRepo, stockRepo: StockRepo, transactionRepo: TransactionRepo) => {
        debug('finding returnOrder transaction...');
        const returnOrderTransaction = await transactionRepo.transactionModel.findById(returnOrderTransactionId)
            .then((doc) => {
                if (doc === null) {
                    throw new errors.NotFound('transaction');
                }

                return <IReturnOrderTransaction>doc.toObject();
            });
        debug('processing return order...', returnOrderTransaction);
        const transactionResult = <PlaceOrderTransactionFactory.IResult>returnOrderTransaction.object.transaction.result;

        // 取引に対するクレジットカード承認アクションを取得
        const orderId = transactionResult.gmoOrderId;

        // 取引状態参照
        const searchTradeResult = await GMO.services.credit.searchTrade({
            shopId: <string>process.env.GMO_SHOP_ID,
            shopPass: <string>process.env.GMO_SHOP_PASS,
            orderId: orderId
        });
        debug('searchTradeResult:', searchTradeResult);
        debug('trade already changed?', (searchTradeResult.tranId !== returnOrderTransaction.object.gmoTradeBefore.tranId));

        // GMO鳥義気状態に変更がなければ金額変更
        if (searchTradeResult.tranId === returnOrderTransaction.object.gmoTradeBefore.tranId) {
            debug('changing amount...', orderId);
            await GMO.services.credit.changeTran({
                shopId: <string>process.env.GMO_SHOP_ID,
                shopPass: <string>process.env.GMO_SHOP_PASS,
                accessId: searchTradeResult.accessId,
                accessPass: searchTradeResult.accessPass,
                jobCd: GMO.utils.util.JobCd.Capture,
                amount: returnOrderTransaction.object.cancellationFee
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
            debug('canceling a reservation...', reservation.qr_str);
            await reservationRepo.reservationModel.findOneAndUpdate(
                { qr_str: reservation.qr_str },
                { status: ReservationStatusType.ReservationCancelled }
            ).exec();

            // 在庫を空きに(在庫IDに対して、元の状態に戻す)
            debug('making a stock available...', reservation.stock);
            await stockRepo.stockModel.findOneAndUpdate(
                {
                    _id: reservation.stock,
                    availability: reservation.stock_availability_after,
                    holder: returnOrderTransaction.object.transaction.id // 対象取引に保持されている
                },
                {
                    $set: { availability: reservation.stock_availability_before },
                    $unset: { holder: 1 }
                }
            ).exec();
        }));
    };
}
