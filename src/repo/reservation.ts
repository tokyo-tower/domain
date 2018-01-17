import { Connection } from 'mongoose';

import * as factory from '@motionpicture/ttts-factory';
import ReservationModel from '../repo/mongoose/model/reservation';

/**
 * 予約レポジトリー
 * @class repository.Reservation
 */
export class MongoRepository {
    public readonly reservationModel: typeof ReservationModel;

    constructor(connection: Connection) {
        this.reservationModel = connection.model(ReservationModel.modelName);
    }

    /**
     * イベント予約を保管する
     * @param {factory.reservation.event.IReservation} reservation
     */
    public async saveEventReservation(reservation: factory.reservation.event.IReservation) {
        await this.reservationModel.findByIdAndUpdate(
            reservation.id,
            {
                $setOnInsert: reservation
            },
            { upsert: true }
        ).exec();
    }
}
