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
 * 資産承認解除(COA座席予約)
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
            await stockRepo.stockModel.findByIdAndUpdate(
                tmpReservation._id,
                { status: tmpReservation.status_before }
            ).exec();
        }));
    }));
}

/**
 * 資産移動(COA座席予約)
 * @export
 * @function
 * @memberof service.stock
 * @param {string} transactionId 取引ID
 */
export async function transferSeatReservation(transactionId: string) {
    const transactionRepository = new TransactionRepo(mongoose.connection);
    const stockRepo = new StockRepo(mongoose.connection);
    const reservationRepo = new ReservationRepo(mongoose.connection);

    const transaction = await transactionRepository.findPlaceOrderById(transactionId);
    const eventReservations = (<factory.transaction.placeOrder.IResult>transaction.result).eventReservations;

    await Promise.all(eventReservations.map(async (eventReservation) => {
        // 在庫のステータスを変更
        await stockRepo.stockModel.findOneAndUpdate(
            {
                performance: eventReservation.performance,
                seat_code: eventReservation.seat_code
            },
            { status: eventReservation.status }
        ).exec();

        /// 予約データを作成する
        await reservationRepo.saveEventReservation(eventReservation);
    }));
}
