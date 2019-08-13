import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';

import * as factory from '@tokyotower/factory';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('ttts-domain:service');

/**
 * クレジットカード売上確定
 * @param transactionId 取引ID
 */
export function settleCreditCardAuth(transactionId: string) {
    return async (transactionRepo: TransactionRepo) => {
        const transaction = await transactionRepo.findById({ typeOf: factory.transactionType.PlaceOrder, id: transactionId });
        const authorizeActions = transaction.object.authorizeActions
            .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === factory.paymentMethodType.CreditCard);

        await Promise.all(authorizeActions.map(async (authorizeAction) => {
            const entryTranArgs = (<factory.action.authorize.creditCard.IResult>authorizeAction.result).entryTranArgs;
            const execTranArgs = (<factory.action.authorize.creditCard.IResult>authorizeAction.result).execTranArgs;

            // 取引状態参照
            const searchTradeResult = await GMO.services.credit.searchTrade({
                shopId: entryTranArgs.shopId,
                shopPass: entryTranArgs.shopPass,
                orderId: entryTranArgs.orderId
            });

            if (searchTradeResult.jobCd === GMO.utils.util.JobCd.Sales) {
                debug('already in SALES');
                // すでに実売上済み

                return;
            }

            debug('calling alterTran...');
            const alterTranResult = await GMO.services.credit.alterTran({
                shopId: entryTranArgs.shopId,
                shopPass: entryTranArgs.shopPass,
                accessId: execTranArgs.accessId,
                accessPass: execTranArgs.accessPass,
                jobCd: GMO.utils.util.JobCd.Sales,
                amount: entryTranArgs.amount
            });

            // 取引結果に売上結果連携
            await transactionRepo.transactionModel.findByIdAndUpdate(
                transactionId,
                {
                    'result.creditCardSales': alterTranResult
                }
            ).exec();

            // 失敗したら取引状態確認してどうこう、という処理も考えうるが、
            // GMOはapiのコール制限が厳しく、下手にコールするとすぐにクライアントサイドにも影響をあたえてしまう
            // リトライはタスクの仕組みに含まれているので失敗してもここでは何もしない
        }));
    };
}
