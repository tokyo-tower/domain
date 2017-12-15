/**
 * sales service
 * mainly handle transactions with GMO
 * @namespace service.sales
 */

import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';
import * as mongoose from 'mongoose';

import * as factory from '../factory';
import { MongoRepository as CreditCardAuthorizeActionRepo } from '../repo/action/authorize/creditCard';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('ttts-domain:service:sales');

/**
 * クレジットカードオーソリ取消
 * @export
 * @function
 * @memberof service.sales
 * @param {string} transactionId 取引ID
 */
export async function cancelCreditCardAuth(transactionId: string) {
    const creditCardAuthorizeActionRepo = new CreditCardAuthorizeActionRepo(mongoose.connection);

    // クレジットカード仮売上アクションを取得
    const authorizeActions: factory.action.authorize.creditCard.IAction[] =
        await creditCardAuthorizeActionRepo.findByTransactionId(transactionId)
            .then((actions) => actions.filter((action) => action.actionStatus === factory.actionStatusType.CompletedActionStatus));

    await Promise.all(authorizeActions.map(async (action) => {
        const entryTranArgs = (<factory.action.authorize.creditCard.IResult>action.result).entryTranArgs;
        const execTranArgs = (<factory.action.authorize.creditCard.IResult>action.result).execTranArgs;

        debug('calling alterTran...');
        await GMO.services.credit.alterTran({
            shopId: entryTranArgs.shopId,
            shopPass: entryTranArgs.shopPass,
            accessId: execTranArgs.accessId,
            accessPass: execTranArgs.accessPass,
            jobCd: GMO.utils.util.JobCd.Void,
            amount: entryTranArgs.amount
        });
    }));

    // 失敗したら取引状態確認してどうこう、という処理も考えうるが、
    // GMOはapiのコール制限が厳しく、下手にコールするとすぐにクライアントサイドにも影響をあたえてしまう
    // リトライはタスクの仕組みに含まれているので失敗してもここでは何もしない
}

/**
 * クレジットカード売上確定
 * @export
 * @function
 * @memberof service.sales
 * @param {string} transactionId 取引ID
 */
export async function settleCreditCardAuth(transactionId: string) {
    const transactionRepo = new TransactionRepo(mongoose.connection);

    const transaction = await transactionRepo.findPlaceOrderById(transactionId);
    const authorizeActions = transaction.object.authorizeActions
        .filter((action) => action.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((action) => action.purpose.typeOf === factory.action.authorize.authorizeActionPurpose.CreditCard);

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
}
