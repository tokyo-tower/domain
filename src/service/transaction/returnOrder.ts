/**
 * 注文返品サービス
 * @namespace service.transaction.returnOrder
 */

import * as moment from 'moment';

import * as errors from '../../factory/errors';
import { IResult as IPlaceOrderTransactionResult, ITransaction as IPlaceOrderTransaction } from '../../factory/transaction/placeOrder';
import * as ReturnOrderTransactionFactory from '../../factory/transaction/returnOrder';
import TransactionStatusType from '../../factory/transactionStatusType';
import TransactionTasksExportationStatus from '../../factory/transactionTasksExportationStatus';
import TransactionType from '../../factory/transactionType';

import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const CANCELLABLE_DAYS = 3;

export type ITransactionOperation<T> = (transactionRepo: TransactionRepo) => Promise<T>;

/**
 * 予約キャンセル処理
 * @memberof inquiry
 * @function cancel
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export function confirm(params: {
    performanceDay: string;
    paymentNo: string;
    cancellationFee: number;
}): ITransactionOperation<ReturnOrderTransactionFactory.ITransaction> {
    return async (transactionRepo: TransactionRepo) => {
        const now = new Date();

        // 返品対象の取引取得
        const transaction = await transactionRepo.transactionModel.findOne(
            {
                typeOf: TransactionType.PlaceOrder,
                status: TransactionStatusType.Confirmed,
                'result.eventReservations.performance_day': params.performanceDay,
                'result.eventReservations.payment_no': params.paymentNo
            }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new errors.NotFound('transaction');
            }

            return <IPlaceOrderTransaction>doc.toObject();
        });

        // 検証
        validateRequest(now, params.performanceDay);

        const endDate = new Date();
        const eventReservations = (<IPlaceOrderTransactionResult>transaction.result).eventReservations;
        const cancelName = `${eventReservations[0].purchaser_last_name} ${eventReservations[0].purchaser_first_name}`;
        const returnOrderAttributes = ReturnOrderTransactionFactory.createAttributes({
            status: TransactionStatusType.Confirmed,
            agent: <any>{
            },
            result: {},
            object: {
                transaction: transaction,
                cancelName: cancelName,
                cancellationFee: params.cancellationFee
            },
            expires: endDate,
            startDate: now,
            endDate: endDate,
            tasksExportationStatus: TransactionTasksExportationStatus.Unexported
        });

        return transactionRepo.transactionModel.create(returnOrderAttributes)
            .then((doc) => <ReturnOrderTransactionFactory.ITransaction>doc.toObject());

        // キャンセルリクエスト保管
        // await ttts.Models.CustomerCancelRequest.create({
        //     reservation: reservations[0],
        //     tickets: (<any>ttts.Models.CustomerCancelRequest).getTickets(reservations),
        //     cancel_name: `${reservations[0].purchaser_last_name} ${reservations[0].purchaser_first_name}`,
        //     cancellation_fee: cancellationFee
        // });
    };
}

// async function cancelProcess() {
//     // キャンセル
//     try {
//         // 金額変更(エラー時はchangeTran内部で例外発生)
//         await ttts.GMO.services.credit.changeTran({
//             shopId: <string>process.env.GMO_SHOP_ID,
//             shopPass: <string>process.env.GMO_SHOP_PASS,
//             accessId: <string>reservations[0].gmo_access_id,
//             accessPass: <string>reservations[0].gmo_access_pass,
//             jobCd: ttts.GMO.utils.util.JobCd.Capture,
//             amount: cancellationFee
//         });
//     } catch (err) {
//         // GMO金額変更apiエラーはキャンセルできなかたことをユーザーに知らせる
//         res.json({
//             success: false,
//             validation: null,
//             error: errorMessage
//         });

//         return;
//     }

//     const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
//     const stockRepo = new ttts.repository.Stock(ttts.mongoose.connection);
//     const promises = ((<any>reservations).map(async (reservation: any) => {
//         // キャンセルメール送信
//         await sendEmail(reservations[0].purchaser_email, getCancelMail(req, reservations, cancellationFee));

//         // 2017/11 本体チケットかつ特殊チケットの時、時間ごとの予約データ解放(AVAILABLEに変更)
//         if (reservation.ticket_ttts_extension.category !== ttts.TicketTypeGroupUtil.TICKET_TYPE_CATEGORY_NORMAL &&
//             reservation.seat_code === reservation.reservation_ttts_extension.seat_code_base) {
//             await ttts.Models.ReservationPerHour.findOneAndUpdate(
//                 { reservation_id: reservation._id.toString() },
//                 {
//                     $set: { status: ttts.factory.itemAvailability.InStock },
//                     $unset: { expired_at: 1, reservation_id: 1 }
//                 },
//                 { new: true }
//             ).exec();
//             logger.info('ReservationPerHour clear reservation_id=', reservation._id.toString());
//         }
//         // 予約データ解放(AVAILABLEに変更)
//         await reservationRepo.reservationModel.findByIdAndUpdate(
//             reservation._id,
//             {
//                 $set: { status: ttts.factory.reservationStatusType.ReservationCancelled },
//                 $unset: getUnsetFields(reservation)
//             }
//         ).exec();
//         logger.info('Reservation clear =', JSON.stringify(reservation));

//         // 在庫を空きに(在庫IDに対して、元の状態に戻す)
//         await stockRepo.stockModel.findByIdAndUpdate(
//             reservation.get('stock'),
//             { availability: reservation.get('stock_availability_before') }
//         ).exec();
//     }));

//     await Promise.all(promises);
// }

/**
 * キャンセル料合計取得
 *
 * @param {any} reservations
 * @param {string} today
 * @return {number}
 */
// function getCancellationFee(reservations: any[], today: string): number {
//     let cancellationFee: number = 0;
//     for (const reservation of reservations){
//         if (reservation.status !== ReservationUtil.STATUS_RESERVED) {
//             continue;
//         }
//         // キャンセル料合計
//         cancellationFee += getCancelCharge(reservation, today);
//     }

//     return cancellationFee;
// }
/**
 * キャンセル料取得
 *
 * @param {any} reservation
 * @param {string} today
 * @param {number} index
 */
// function getCancelCharge( reservation: any, today: string): number {
//     const cancelInfo: any[] = reservation.ticket_cancel_charge;
//     let cancelCharge: number = cancelInfo[cancelInfo.length - 1].charge;

//     const performanceDay = reservation.performance_day;
//     let dayTo = performanceDay;
//     let index: number = 0;
//     // 本日が入塔予約日の3日前以内
//     for (index = 0; index < cancelInfo.length; index += 1) {
//         const limitDays: number = cancelInfo[index].days;
//         const dayFrom = moment(performanceDay, 'YYYYMMDD').add(limitDays * -1, 'days').format('YYYYMMDD');
//         // 本日が一番大きい設定日を過ぎていたら-1(キャンセル料は全額)
//         if ( index === 0 && today > dayFrom) {
//             cancelCharge = reservation.charge;
//             break;
//         }
//         // 日付終了日 >= 本日 >= 日付開始日
//         if (dayTo >= today && today > dayFrom) {
//             cancelCharge =  cancelInfo[index - 1].charge;
//             break;
//         }
//         dayTo = dayFrom;
//     }

//     return cancelCharge;
// }

/**
 * キャンセル検証
 */
function validateRequest(now: Date, performanceDay: string) {
    // 入塔予定日+キャンセル可能日が本日日付を過ぎていたらエラー
    // if (cancellationFee < 0) {
    //     (<any>errors).cancelDays = {msg: 'キャンセルできる期限を過ぎています。'};
    // }

    // 入塔予定日の3日前までキャンセル可能(3日前を過ぎていたらエラー)
    const cancellableThrough = moment(`${performanceDay} 00:00:00+09:00`, 'YYYYMMDD HH:mm:ssZ')
        .add(-CANCELLABLE_DAYS + 1, 'days').toDate();
    if (cancellableThrough <= now) {
        throw new errors.Argument('performance_day', 'キャンセルできる期限を過ぎています。');
    }
}
