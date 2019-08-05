/**
 * クレジットカード承認アクションサービス
 */
import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';

import * as factory from '@tokyotower/factory';
import { MongoRepository as AuthorizeActionRepo } from '../../../../../repo/action/authorize';
import { MongoRepository as ProjectRepo } from '../../../../../repo/project';
import { MongoRepository as SellerRepo } from '../../../../../repo/seller';
import { MongoRepository as TransactionRepo } from '../../../../../repo/transaction';

const debug = createDebug('ttts-domain:service');

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

export type ICreateOperation<T> = (
    authorizeActionRepo: AuthorizeActionRepo,
    sellerRepo: SellerRepo,
    transactionRepo: TransactionRepo,
    creditService: GMO.service.Credit,
    projectRepo: ProjectRepo
) => Promise<T>;

/**
 * オーソリを取得するクレジットカード情報インターフェース
 */
export type ICreditCard4authorizeAction =
    factory.paymentMethod.paymentCard.creditCard.IUncheckedCardRaw |
    factory.paymentMethod.paymentCard.creditCard.IUncheckedCardTokenized |
    factory.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember;

/**
 * クレジットカードオーソリ取得
 */
export function create(
    agentId: string,
    transactionId: string,
    orderId: string,
    amount: number,
    method: GMO.utils.util.Method,
    creditCard: ICreditCard4authorizeAction
): ICreateOperation<factory.action.authorize.creditCard.IAction> {
    // tslint:disable-next-line:max-func-body-length
    return async (
        authorizeActionRepo: AuthorizeActionRepo,
        sellerRepo: SellerRepo,
        transactionRepo: TransactionRepo,
        creditService: GMO.service.Credit,
        projectRepo: ProjectRepo
    ) => {
        const projectDetails = await projectRepo.findById({ id: project.id });
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (projectDetails.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (projectDetails.settings.gmo === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // GMOショップ情報取得
        const seller = await sellerRepo.findById({ id: transaction.seller.id });

        // 承認アクションを開始する
        const action = await authorizeActionRepo.start({
            typeOf: factory.actionType.AuthorizeAction,
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            startDate: new Date(),
            agent: {
                id: transaction.agent.id,
                typeOf: factory.personType.Person
            },
            recipient: transaction.seller,
            object: {
                typeOf: factory.paymentMethodType.CreditCard,
                // transactionId: transactionId,
                orderId: orderId,
                amount: amount,
                method: method
            },
            purpose: { typeOf: transaction.typeOf, id: transaction.id }
        });

        // GMOオーソリ取得
        let creditCardPaymentAccepted: factory.seller.IPaymentAccepted<factory.cinerino.paymentMethodType.CreditCard>;
        let entryTranArgs: GMO.services.credit.IEntryTranArgs;
        let execTranArgs: GMO.services.credit.IExecTranArgs;
        let entryTranResult: GMO.services.credit.IEntryTranResult;
        let execTranResult: GMO.services.credit.IExecTranResult;
        let searchTradeResult: GMO.services.credit.ISearchTradeResult | undefined;

        if (seller.paymentAccepted === undefined) {
            throw new factory.errors.Argument('transaction', 'Credit card payment not accepted.');
        }
        creditCardPaymentAccepted = <factory.seller.IPaymentAccepted<factory.cinerino.paymentMethodType.CreditCard>>
            seller.paymentAccepted.find(
                (a) => a.paymentMethodType === factory.paymentMethodType.CreditCard
            );
        if (creditCardPaymentAccepted === undefined) {
            throw new factory.errors.Argument('transaction', 'Credit card payment not accepted.');
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (creditCardPaymentAccepted.gmoInfo.shopPass === undefined) {
            throw new factory.errors.Argument('transaction', 'Credit card payment settings not enough');
        }

        try {
            entryTranArgs = {
                shopId: creditCardPaymentAccepted.gmoInfo.shopId,
                shopPass: creditCardPaymentAccepted.gmoInfo.shopPass,
                orderId: orderId,
                jobCd: GMO.utils.util.JobCd.Auth,
                amount: amount
            };
            entryTranResult = await creditService.entryTran(entryTranArgs);
            debug('entryTranResult:', entryTranResult);

            execTranArgs = {
                accessId: entryTranResult.accessId,
                accessPass: entryTranResult.accessPass,
                orderId: orderId,
                method: method,
                siteId: projectDetails.settings.gmo.siteId,
                sitePass: projectDetails.settings.gmo.sitePass,
                cardNo: (<factory.paymentMethod.paymentCard.creditCard.IUncheckedCardRaw>creditCard).cardNo,
                cardPass: (<factory.paymentMethod.paymentCard.creditCard.IUncheckedCardRaw>creditCard).cardPass,
                expire: (<factory.paymentMethod.paymentCard.creditCard.IUncheckedCardRaw>creditCard).expire,
                token: (<factory.paymentMethod.paymentCard.creditCard.IUncheckedCardTokenized>creditCard).token,
                memberId: (<factory.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember>creditCard).memberId,
                cardSeq: (<factory.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember>creditCard).cardSeq,
                seqMode: GMO.utils.util.SeqMode.Physics
            };
            execTranResult = await creditService.execTran(execTranArgs);
            debug('execTranResult:', execTranResult);
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : error;
                await authorizeActionRepo.giveUp(action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            if (error.name === 'GMOServiceBadRequestError') {
                // consider E92000001,E92000002
                // GMO流量制限オーバーエラーの場合
                const serviceUnavailableError = error.errors.find((gmoError: any) => gmoError.info.match(/^E92000001|E92000002$/));
                if (serviceUnavailableError !== undefined) {
                    throw new factory.errors.RateLimitExceeded(serviceUnavailableError.userMessage);
                }

                // オーダーID重複エラーの場合
                const duplicateError = error.errors.find((gmoError: any) => gmoError.info.match(/^E01040010$/));
                if (duplicateError !== undefined) {
                    throw new factory.errors.AlreadyInUse('action.object', ['orderId'], duplicateError.userMessage);
                }

                // その他のGMOエラーに場合、なんらかのクライアントエラー
                throw new factory.errors.Argument('payment');
            } else if (error.name === 'RequestError') {
                // requestモジュールのエラーの場合
                if (error.error !== undefined && error.error.code === 'ETIMEDOUT') {
                    throw new factory.errors.ServiceUnavailable('Credit card payment service temporarily unavailable.');
                }
            }

            throw error;
        }

        try {
            // ベストエフォートでクレジットカード詳細情報を取得
            searchTradeResult = await creditService.searchTrade({
                shopId: creditCardPaymentAccepted.gmoInfo.shopId,
                shopPass: creditCardPaymentAccepted.gmoInfo.shopPass,
                orderId: orderId
            });
        } catch (error) {
            // no op
        }

        // アクションを完了
        debug('ending authorize action...');

        return authorizeActionRepo.complete<factory.paymentMethodType.CreditCard>({
            typeOf: factory.actionType.AuthorizeAction,
            id: action.id,
            result: {
                paymentMethod: factory.paymentMethodType.CreditCard,
                paymentMethodId: orderId,
                paymentStatus: factory.cinerino.paymentStatusType.PaymentDue,
                name: factory.paymentMethodType.CreditCard,
                accountId: (searchTradeResult !== undefined) ? searchTradeResult.cardNo : '',
                amount: amount,
                price: amount,
                entryTranArgs: entryTranArgs,
                entryTranResult: entryTranResult,
                execTranArgs: execTranArgs,
                execTranResult: execTranResult
            }
        });
    };
}

export function cancel(
    agentId: string,
    transactionId: string,
    actionId: string
) {
    return async (
        authorizeActionRepo: AuthorizeActionRepo,
        transactionRepo: TransactionRepo,
        creditService: GMO.service.Credit
    ) => {
        const transaction = await transactionRepo.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        const action = await authorizeActionRepo.cancel({ typeOf: factory.actionType.AuthorizeAction, id: actionId });
        const actionResult = <factory.action.authorize.creditCard.IResult>action.result;

        // オーソリ取消
        // 現時点では、ここで失敗したらオーソリ取消をあきらめる
        // GMO混雑エラーはここでも発生する(取消処理でも混雑エラーが発生することは確認済)
        try {
            await creditService.alterTran({
                shopId: actionResult.entryTranArgs.shopId,
                shopPass: actionResult.entryTranArgs.shopPass,
                accessId: actionResult.execTranArgs.accessId,
                accessPass: actionResult.execTranArgs.accessPass,
                jobCd: GMO.utils.util.JobCd.Void
            });
            debug('alterTran processed', GMO.utils.util.JobCd.Void);
        } catch (error) {
            // no op
        }
    };
}
