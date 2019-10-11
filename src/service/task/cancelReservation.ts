import * as cinerino from '@cinerino/domain';
import * as factory from '@tokyotower/factory';
import { IConnectionSettings, IOperation } from '../task';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.CancelReservation>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new cinerino.repository.Action(settings.connection);
        const projectRepo = new cinerino.repository.Project(settings.connection);

        await cinerino.service.reservation.cancelReservation(data)({
            action: actionRepo,
            project: projectRepo
        });
    };
}
