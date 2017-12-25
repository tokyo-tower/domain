/**
 * stock service
 * 在庫の管理に対して責任を負うサービス
 * @namespace service.stock
 */

import * as createDebug from 'debug';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import * as factory from '../factory';

import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../repo/action/authorize/seatReservation';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
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
export function cancelSeatReservationAuth(transactionId: string) {
    return async (
        seatReservationAuthorizeActionRepo: SeatReservationAuthorizeActionRepo,
        stockRepo: StockRepo,
        ticketTypeCategoryRateLimitRepo: TicketTypeCategoryRateLimitRepo
    ) => {
        // 座席仮予約アクションを取得
        const authorizeActions: factory.action.authorize.seatReservation.IAction[] =
            await seatReservationAuthorizeActionRepo.findByTransactionId(transactionId)
                .then((actions) => actions.filter((action) => action.actionStatus === factory.actionStatusType.CompletedActionStatus));

        await Promise.all(authorizeActions.map(async (action) => {
            debug('calling deleteTmpReserve...', action);
            // 在庫を元の状態に戻す
            // stock_availability_afterからstock_availability_beforeに戻せばよいはず
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

                if (tmpReservation.rate_limit_unit_in_seconds > 0) {
                    debug('resetting wheelchair rate limit...');
                    const performance = action.object.performance;
                    const performanceStartDate = moment(`${performance.start_date}`).toDate();
                    const rateLimitKey = {
                        performanceStartDate: performanceStartDate,
                        ticketTypeCategory: tmpReservation.ticket_ttts_extension.category,
                        unitInSeconds: tmpReservation.rate_limit_unit_in_seconds
                    };
                    await ticketTypeCategoryRateLimitRepo.unlock(rateLimitKey);
                    debug('wheelchair rate limit reset.');
                }
            }));

        }));
    };
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
