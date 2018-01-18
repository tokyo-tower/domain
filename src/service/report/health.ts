/**
 * ヘルスチェックサービス
 * 実験的実装中
 * @namespace service.report.health
 */

import * as GMO from '@motionpicture/gmo-service';
import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';

import { MongoRepository as GMONotificationRepo } from '../../repo/gmoNotification';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

export type GMONotificationOperation<T> = (gmoNotificationRepository: GMONotificationRepo) => Promise<T>;
export type IGMOResultNotification = GMO.factory.resultNotification.creditCard.IResultNotification;

const debug = createDebug('ttts-domain:service:report:health');

/**
 * GMO売上健康診断レポートインターフェース
 * @export
 * @interface
 * @memberof service.report
 */
export interface IReportOfGMOSalesHealthCheck {
    madeFrom: Date;
    madeThrough: Date;
    numberOfSales: number;
    totalAmount: number;
    totalAmountCurrency: factory.priceCurrency;
    unhealthGMOSales: IUnhealthGMOSale[];
}

/**
 * 不健康なGMO売上インターフェース
 * @export
 * @interface
 * @memberof service.report
 */
export interface IUnhealthGMOSale {
    orderId: string;
    amount: number;
    reason: string;
}

/**
 * 期間指定でGMO実売上の健康診断を実施する
 * @export
 * @function
 * @memberof service.report
 */
export function checkGMOSales(madeFrom: Date, madeThrough: Date) {
    return async (gmoNotificationRepo: GMONotificationRepo, transactionRepo: TransactionRepo): Promise<IReportOfGMOSalesHealthCheck> => {
        const sales = await gmoNotificationRepo.searchSales({
            tranDateFrom: madeFrom,
            tranDateThrough: madeThrough
        });
        debug(sales.length, 'sales found.');

        const totalAmount = sales.reduce((a, b) => a + b.amount, 0);

        // オーダーIDごとに有効性確認すると、コマンド過多でMongoDBにある程度の負荷をかけてしまう
        // まとめて検索してから、ローカルで有効性を確認する必要がある
        const orderIds = sales.map((sale) => sale.orderId);

        // オーダーIDが承認アクションに含まれる注文取引を参照
        debug('searching transactions by orderIds...');
        const transactions = <factory.transaction.placeOrder.ITransaction[]>await transactionRepo.transactionModel.find(
            {
                typeOf: factory.transactionType.PlaceOrder,
                status: factory.transactionStatusType.Confirmed,
                'object.authorizeActions.object.orderId': { $in: orderIds }
            }
        ).lean().exec();
        debug(transactions.length, 'transactions found. checking...');

        const errors: IUnhealthGMOSale[] = [];
        sales.forEach((gmoSale) => {
            try {
                // オーダーIDに該当する取引がなければエラー
                const transactionByOrderId = transactions.find((transaction) => {
                    const authorizeActionByOrderId = transaction.object.authorizeActions.find(
                        (authorizeAction: factory.action.authorize.creditCard.IAction) => {
                            return authorizeAction.object.orderId === gmoSale.orderId;
                        }
                    );

                    return authorizeActionByOrderId !== undefined;
                });
                if (transactionByOrderId === undefined) {
                    throw new Error('transaction by orderId not found');
                }

                // アクセスIDが一致するかどうか
                const creditCardAuthorizeAction =
                    <factory.action.authorize.creditCard.IAction>transactionByOrderId.object.authorizeActions.find(
                        (authorizeAction: factory.action.authorize.creditCard.IAction) => {
                            return authorizeAction.object.orderId === gmoSale.orderId;
                        }
                    );
                debug('creditCardAuthorizeAction found for orderId', gmoSale.orderId);

                const authorizeActionResult = <factory.action.authorize.creditCard.IResult>creditCardAuthorizeAction.result;
                if (authorizeActionResult.execTranArgs.accessId !== gmoSale.accessId) {
                    throw new Error('accessId not matched');
                }

                if (creditCardAuthorizeAction.object.payType !== gmoSale.payType) {
                    throw new Error('payType not matched');
                }

                // オーソリの金額と同一かどうか
                if (creditCardAuthorizeAction.object.amount !== gmoSale.amount) {
                    throw new Error('amount not matched');
                }
            } catch (error) {
                errors.push({
                    orderId: gmoSale.orderId,
                    amount: gmoSale.amount,
                    reason: error.message
                });
            }
        });

        return {
            madeFrom: madeFrom,
            madeThrough: madeThrough,
            numberOfSales: sales.length,
            totalAmount: totalAmount,
            totalAmountCurrency: factory.priceCurrency.JPY,
            unhealthGMOSales: errors
        };
    };
}
