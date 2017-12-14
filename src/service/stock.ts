/**
 * stock service
 * 在庫の管理に対して責任を負うサービス
 * @namespace service.stock
 */

import * as createDebug from 'debug';
import * as mongoose from 'mongoose';

import * as factory from '../factory';
import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../repo/action/authorize/seatReservation';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('ttts-domain:service:stock');

/**
 * 資産承認解除(在庫ステータス変更)
 * @export
 * @function
 * @memberof service.stock
 * @param {string} transactionId 取引ID
 */
export async function cancelSeatReservationAuth(transactionId: string) {
    const seatReservationAuthorizeActionRepo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
    const stockRepo = new StockRepo(mongoose.connection);

    // 座席仮予約アクションを取得
    const authorizeActions: factory.action.authorize.seatReservation.IAction[] =
        await seatReservationAuthorizeActionRepo.findByTransactionId(transactionId)
            .then((actions) => actions.filter((action) => action.actionStatus === factory.actionStatusType.CompletedActionStatus));

    await Promise.all(authorizeActions.map(async (action) => {
        debug('calling deleteTmpReserve...', action);
        // 在庫を元の状態に戻す
        // TTTS確保も、仮予約も、status_beforeに戻せばよいはず
        const tmpReservations = (<factory.action.authorize.seatReservation.IResult>action.result).tmpReservations;

        await Promise.all(tmpReservations.map(async (tmpReservation) => {
            await stockRepo.stockModel.findOneAndUpdate(
                {
                    _id: tmpReservation.stock,
                    availability: tmpReservation.stock_availability_after,
                    holder: transactionId // 対象取引に保持されている
                },
                {
                    $set: { availability: tmpReservation.stock_availability_before },
                    $unset: { holder: 1 }
                }
            ).exec();
        }));

        // tslint:disable-next-line:no-suspicious-comment
        // TODO 車椅子の流入制限についても対処

        await resetTmps();
    }));
}

/**
 * 仮予約ステータスで、一定時間過ぎた予約を空席にする
 */
export async function resetTmps(): Promise<void> {
    // const BUFFER_PERIOD_SECONDS = -60;
    // debug('resetting temporary reservationPerHour...');
    // await ttts.Models.ReservationPerHour.update(
    //     {
    //         status: ttts.factory.itemAvailability.SoldOut,
    //         expired_at: {
    //             // 念のため、仮予約有効期間より1分長めにしておく
    //             $lt: moment().add(BUFFER_PERIOD_SECONDS, 'seconds').toISOString()
    //         }
    //     },
    //     {
    //         $set: {
    //             status: ttts.factory.itemAvailability.InStock
    //         },
    //         $unset: {
    //             expired_at: 1,
    //             reservation_id: 1
    //         }
    //     },
    //     {
    //         multi: true
    //     }
    // ).exec();
}

/**
 * 資産移動(予約データ作成)
 * @export
 * @function
 * @memberof service.stock
 * @param {string} transactionId 取引ID
 */
export async function transferSeatReservation(transactionId: string) {
    const transactionRepository = new TransactionRepo(mongoose.connection);
    const reservationRepo = new ReservationRepo(mongoose.connection);

    const transaction = await transactionRepository.findPlaceOrderById(transactionId);
    const eventReservations = (<factory.transaction.placeOrder.IResult>transaction.result).eventReservations;

    await Promise.all(eventReservations.map(async (eventReservation) => {
        /// 予約データを作成する
        await reservationRepo.saveEventReservation(eventReservation);
    }));
}
