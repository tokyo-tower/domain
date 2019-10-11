import * as cinerino from '@cinerino/domain';

import { IConnectionSettings, IOperation } from '../task';

import * as factory from '@tokyotower/factory';

/**
 * タスク実行関数
 */
export function call(data: factory.cinerino.task.IData<factory.cinerino.taskName.PayCreditCard>): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new cinerino.repository.Action(settings.connection);
        const invoiceRepo = new cinerino.repository.Invoice(settings.connection);
        const projectRepo = new cinerino.repository.Project(settings.connection);
        const sellerRepo = new cinerino.repository.Seller(settings.connection);

        await cinerino.service.payment.creditCard.payCreditCard(data)({
            action: actionRepo,
            invoice: invoiceRepo,
            project: projectRepo,
            seller: sellerRepo
        });
    };
}
