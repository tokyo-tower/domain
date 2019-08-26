import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';

import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.ConfirmReservation>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new ActionRepo(settings.connection);
        const projectRepo = new ProjectRepo(settings.connection);

        await cinerino.service.reservation.confirmReservation(data)({
            action: actionRepo,
            project: projectRepo
        });
    };
}
