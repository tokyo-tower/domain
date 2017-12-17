/**
 * 座席予約承認アクションサービス
 * @namespace service.transaction.placeOrderInProgress.action.authorize.seatReservation
 */

import * as createDebug from 'debug';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import * as factory from '../../../../../factory';
// import * as Models from '../../../../../repo/mongoose';
import * as ReservationUtil from '../../../../../util/reservation';
import * as TicketTypeGroupUtil from '../../../../../util/ticketTypeGroup';

import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../../../../../repo/action/authorize/seatReservation';
import { MongoRepository as PerformanceRepo } from '../../../../../repo/performance';
import { MongoRepository as StockRepo } from '../../../../../repo/stock';
import { MongoRepository as TransactionRepo } from '../../../../../repo/transaction';

const debug = createDebug('ttts-domain:service:transaction:placeOrderInProgress:action:authorize:seatReservation');

/**
 * 座席予約に対する承認アクションを開始する前の処理
 * 供給情報の有効性の確認などを行う。
 * この処理次第で、どのような供給情報を受け入れられるかが決定するので、とても大事な処理です。
 * バグ、不足等あれば、随時更新することが望ましい。
 * @function
 */
// function validateOffers(
//     performance: factory.performance.IPerformanceWithDetails,
//     offers: factory.offer.seatReservation.IOffer[]
// ): factory.offer.seatReservation.IOfferWithDetails[] {
// }

/**
 * 座席を仮予約する
 * 承認アクションオブジェクトが返却されます。
 * @export
 * @function
 * @memberof service.transaction.placeOrderInProgress.action.authorize.seatReservation
 * @param {string} agentId 取引主体ID
 * @param {string} transactionId 取引ID
 * @param {string} eventIdentifier イベント識別子
 * @param {factory.offer.ISeatReservationOffer[]} offers 供給情報
 */
// tslint:disable-next-line:max-func-body-length
export async function create(
    agentId: string,
    transactionId: string,
    perfomanceId: string,
    offers: factory.offer.seatReservation.IOffer[]
): Promise<factory.action.authorize.seatReservation.IAction> {
    debug('creating seatReservation authorizeACtion...', offers);
    const transactionRepo = new TransactionRepo(mongoose.connection);
    const performanceRepo = new PerformanceRepo(mongoose.connection);
    const seatReservationAuthorizeActionRepo = new SeatReservationAuthorizeActionRepo(mongoose.connection);

    const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

    if (transaction.agent.id !== agentId) {
        throw new factory.errors.Forbidden('A specified transaction is not yours.');
    }

    // パフォーマンスを取得
    const performance = await performanceRepo.findById(perfomanceId);

    // 供給情報の有効性を確認
    // tslint:disable-next-line:no-suspicious-comment
    // TODO バリデーション

    // const offersWithDetails = await validateOffers(performance, offers);

    // 承認アクションを開始
    const action = await seatReservationAuthorizeActionRepo.start(
        transaction.seller,
        {
            id: transaction.agent.id,
            typeOf: factory.personType.Person
        },
        {
            transactionId: transactionId,
            offers: offers,
            performance: performance
        }
    );

    // 在庫から仮予約
    let paymentNo: string;
    const tmpReservations: factory.action.authorize.seatReservation.ITmpReservation[] = [];

    try {
        // この時点でトークンに対して購入番号発行(上映日が決まれば購入番号を発行できる)
        paymentNo = await ReservationUtil.publishPaymentNo(performance.day);

        // 在庫をおさえると、座席コードが決定する
        debug('findding available seats...');

        // 予約情報更新(「仮予約:TEMPORARY」にアップデートする処理を枚数分実行)
        await Promise.all(offers.map(async (offer) => {
            const tmpReservationsByOffer = await reserveTemporarilyByOffer(
                transaction.id, paymentNo, transaction.object.purchaser_group, performance, offer
            );
            tmpReservations.push(...tmpReservationsByOffer);
        }));
        debug('tmp reservations created.', tmpReservations);

        // 予約枚数が指定枚数に達しなかった時,予約可能に戻す
        if (tmpReservations.length < offers.length + offers.reduce((a, b) => a + b.extra.length, 0)) {
            await removeTmpReservations(tmpReservations);

            // "予約可能な席がございません"
            throw new Error('No available seats.');
        }
    } catch (error) {
        // actionにエラー結果を追加
        try {
            const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : error;
            await seatReservationAuthorizeActionRepo.giveUp(action.id, actionError);
        } catch (__) {
            // 失敗したら仕方ない
        }

        // メッセージ「座席取得失敗」の場合は、座席の重複とみなす
        if (error.message === 'No available seats.') {
            throw new factory.errors.AlreadyInUse('action.object', ['offers'], error.message);
        }

        throw new factory.errors.ServiceUnavailable('Unexepected error occurred.');
    }

    // アクションを完了
    debug('ending authorize action...');

    return seatReservationAuthorizeActionRepo.complete(
        action.id,
        {
            price: tmpReservations.reduce((a, b) => a + b.charge, 0),
            tmpReservations: tmpReservations
        }
    );
}

/**
 * 1offerの仮予約を実行する
 */
// tslint:disable-next-line:max-func-body-length
async function reserveTemporarilyByOffer(
    transactionId: string,
    paymentNo: string,
    purchaserGroup: string,
    performance: factory.performance.IPerformanceWithDetails,
    offer: factory.offer.seatReservation.IOffer
): Promise<factory.action.authorize.seatReservation.ITmpReservation[]> {
    const stockRepo = new StockRepo(mongoose.connection);
    // チケット情報
    // tslint:disable-next-line:max-line-length
    // const ticketType = reservationModel.ticketTypes.find((ticketTypeInArray) => (ticketTypeInArray._id === choiceInfo.ticket_type));
    // if (ticketType === undefined) {
    //     throw new Error(req.__('Message.UnexpectedError'));
    // }

    // 予約情報更新キーセット(パフォーマンス,'予約可能')
    const tmpReservations: factory.action.authorize.seatReservation.ITmpReservation[] = [];

    try {
        // 在庫ステータス変更
        const stock = await stockRepo.stockModel.findOneAndUpdate(
            {
                performance: performance.id,
                availability: factory.itemAvailability.InStock
            },
            {
                availability: factory.itemAvailability.OutOfStock,
                holder: transactionId
            },
            { new: true }
        ).exec();
        debug('stock found.', stock);

        // 在庫がばなければ失敗
        if (stock !== null) {
            const seatCode = stock.get('seat_code');
            const seatInfo = performance.screen.sections[0].seats.find((seat) => (seat.code === seatCode));
            if (seatInfo === undefined) {
                throw new Error('Invalid Seat Code.');
            }

            tmpReservations.push({
                stock: stock.get('id'),
                stock_availability_before: factory.itemAvailability.InStock,
                stock_availability_after: stock.get('availability'),
                stock_holder: stock.get('holder'),
                status_after: factory.reservationStatusType.ReservationConfirmed,
                seat_code: seatCode,
                seat_grade_name: seatInfo.grade.name,
                seat_grade_additional_charge: seatInfo.grade.additional_charge,
                ticket_type: offer.ticket_type,
                ticket_type_name: offer.ticket_type_name,
                ticket_type_charge: offer.ticket_type_charge,
                charge: getCharge(offer.ticket_type_charge, seatInfo.grade.additional_charge),
                watcher_name: offer.watcher_name,
                ticket_cancel_charge: offer.ticket_cancel_charge,
                ticket_ttts_extension: offer.ticket_ttts_extension,
                performance_ttts_extension: offer.performance_ttts_extension,
                reservation_ttts_extension: {
                    seat_code_base: seatCode
                },
                payment_no: paymentNo,
                purchaser_group: purchaserGroup
            });

            // 時間ごとの予約情報更新
            // tslint:disable-next-line:no-suspicious-comment
            if (offer.ticket_ttts_extension.category !== TicketTypeGroupUtil.TICKET_TYPE_CATEGORY_NORMAL) {
                const isUpdatedReservationPerHour = await updateReservationPerHour(
                    stock._id.toString(),
                    // tslint:disable-next-line:no-magic-numbers no-suspicious-comment
                    moment().add(30, 'minutes').toDate(), // TODO 実装
                    offer.ticket_ttts_extension.category,
                    performance
                );

                if (!isUpdatedReservationPerHour) {
                    throw new Error('Reservations per hour unavailable.');
                }
            }

            // 余分確保分の予約更新
            const promises = offer.extra.map(async () => {
                // '予約可能'を'仮予約'に変更
                const extraStock = await stockRepo.stockModel.findOneAndUpdate(
                    {
                        performance: performance.id,
                        availability: factory.itemAvailability.InStock
                    },
                    {
                        availability: factory.itemAvailability.OutOfStock,
                        holder: transactionId,
                        reservation_ttts_extension: {
                            seat_code_base: seatCode
                        }
                    },
                    { new: true }
                ).exec();
                debug('stock found.', extraStock);

                // 更新エラー(対象データなし):次のseatへ
                if (extraStock !== null) {
                    tmpReservations.push({
                        stock: stock.get('id'),
                        stock_availability_before: factory.itemAvailability.InStock,
                        stock_availability_after: extraStock.get('availability'),
                        stock_holder: extraStock.get('holder'),
                        status_after: factory.reservationStatusType.ReservationSecuredExtra,
                        seat_code: extraStock.get('seat_code'),
                        seat_grade_name: seatInfo.grade.name,
                        seat_grade_additional_charge: seatInfo.grade.additional_charge,
                        ticket_type: offer.ticket_type,
                        ticket_type_name: offer.ticket_type_name,
                        ticket_type_charge: offer.ticket_type_charge,
                        charge: getCharge(offer.ticket_type_charge, seatInfo.grade.additional_charge),
                        watcher_name: offer.watcher_name,
                        ticket_cancel_charge: offer.ticket_cancel_charge,
                        ticket_ttts_extension: offer.ticket_ttts_extension,
                        performance_ttts_extension: offer.performance_ttts_extension,
                        reservation_ttts_extension: {
                            seat_code_base: seatCode
                        },
                        payment_no: paymentNo,
                        purchaser_group: purchaserGroup
                    });
                }
            });

            await Promise.all(promises);
        }
    } catch (error) {
        // no op
    }

    return tmpReservations;
}

/**
 * 座席単体の料金を算出する
 */
function getCharge(
    ticketTypeCharge: number,
    seatGradeAdditionalCharge: number
): number {
    let charge = 0;

    if (ticketTypeCharge !== undefined) {
        charge += ticketTypeCharge;

        // 座席グレード分加算
        if (seatGradeAdditionalCharge > 0) {
            charge += seatGradeAdditionalCharge;
        }
    }

    return charge;
}

// const LENGTH_HOUR: number = 2;
/**
 * 座席・券種FIXプロセス/予約情報をDBにsave(仮予約)
 *
 * @param {string} reservationId
 * @param {any} expiredAt
 * @param {string} ticketType
 * @param {string} performance
 * @returns {Promise<boolean>}
 */
async function updateReservationPerHour(
    __1: string,
    __2: any,
    __3: string,
    __4: any
): Promise<boolean> {
    return true;

    // tslint:disable-next-line:no-suspicious-comment
    // TODO 実装
    // '予約可能'を'仮予約'に変更
    // const reservation = await Models.ReservationPerHour.findOneAndUpdate(
    //     // 更新キー(入塔日＋時間帯)
    //     {
    //         performance_day: performance.day,
    //         performance_hour: performance.start_time.slice(0, LENGTH_HOUR),
    //         ticket_category: ticketTypeCategory,
    //         status: ReservationUtil.STATUS_AVAILABLE
    //     },
    //     {
    //         status: ReservationUtil.STATUS_RESERVED,
    //         expired_at: expiredAt,
    //         reservation_id: reservationId
    //     },
    //     { new: true }
    // ).exec();

    // return reservation !== null;
}

/**
 * 座席予約承認アクションをキャンセルする
 * @export
 * @function
 * @memberof service.transaction.placeOrderInProgress.action.authorize.seatReservation
 * @param agentId アクション主体ID
 * @param transactionId 取引ID
 * @param actionId アクションID
 */
export async function cancel(
    agentId: string,
    transactionId: string,
    actionId: string
) {
    try {
        const transactionRepo = new TransactionRepo(mongoose.connection);
        const seatReservationAuthorizeActionRepo = new SeatReservationAuthorizeActionRepo(mongoose.connection);

        const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // MongoDBでcompleteステータスであるにも関わらず、COAでは削除されている、というのが最悪の状況
        // それだけは回避するためにMongoDBを先に変更
        const action = await seatReservationAuthorizeActionRepo.cancel(actionId, transactionId);
        const actionResult = <factory.action.authorize.seatReservation.IResult>action.result;

        // 在庫から仮予約削除
        debug('removing tmp reservations...', action);
        await removeTmpReservations(actionResult.tmpReservations);
    } catch (error) {
        // no op
    }
}

async function removeTmpReservations(tmpReservations: factory.action.authorize.seatReservation.ITmpReservation[]) {
    const stockRepo = new StockRepo(mongoose.connection);

    await Promise.all(tmpReservations.map(async (tmpReservation) => {
        try {
            await stockRepo.stockModel.findByIdAndUpdate(
                tmpReservation.stock,
                {
                    $set: { availability: factory.itemAvailability.InStock },
                    $unset: { holder: 1 }
                }
            ).exec();
        } catch (error) {
            // no op
        }
    }));

    // 2017/11 時間ごとの予約レコードのSTATUS初期化(車椅子の場合)
    await Promise.all(tmpReservations.filter((r) => r.status_after === factory.reservationStatusType.ReservationConfirmed)
        .map(async (__) => {
            // tslint:disable-next-line:no-suspicious-comment
            // TODO このロジックの意味を確認
            // try {
            //     await Models.ReservationPerHour.findOneAndUpdate(
            //         { reservation_id: tmpReservation._id },
            //         {
            //             $set: { status: ReservationUtil.STATUS_AVAILABLE },
            //             $unset: { expired_at: 1, reservation_id: 1 }
            //         }
            //     ).exec();
            // } catch (error) {
            //     // no op
            // }
        }));
}
