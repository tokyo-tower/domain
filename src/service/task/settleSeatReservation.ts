import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as StockService from '../stock';

/**
 * タスク実行関数
 */
export function call(data: factory.task.settleSeatReservation.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        await StockService.transferSeatReservation(data.transactionId)(
            new TransactionRepo(settings.connection),
            new ReservationRepo(settings.connection),
            new cinerino.repository.Task(settings.connection),
            new cinerino.repository.Project(settings.connection)
        );
    };
}
