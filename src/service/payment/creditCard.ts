/**
 * クレジットカード決済サービス
 */
import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';
import * as moment from 'moment-timezone';
import * as util from 'util';

import * as factory from '@tokyotower/factory';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('cinerino-domain:service');

export import IUncheckedCardRaw = factory.paymentMethod.paymentCard.creditCard.IUncheckedCardRaw;
export import IUncheckedCardTokenized = factory.paymentMethod.paymentCard.creditCard.IUncheckedCardTokenized;
export import IUnauthorizedCardOfMember = factory.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember;

export type IAuthorizeOperation<T> = (repos: {
    action: ActionRepo;
    project: ProjectRepo;
    seller: SellerRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * クレジットカードオーソリ取得
 */
export function authorize(params: {
    project: { id: string };
    agent: { id: string };
    object: factory.cinerino.action.authorize.paymentMethod.creditCard.IObject;
    purpose: factory.cinerino.action.authorize.paymentMethod.any.IPurpose;
}): IAuthorizeOperation<factory.cinerino.action.authorize.paymentMethod.creditCard.IAction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        transaction: TransactionRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (project.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (project.settings.gmo === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const transaction = await repos.transaction.findInProgressById({
            typeOf: <factory.transactionType.PlaceOrder>params.purpose.typeOf,
            id: params.purpose.id
        });

        // 他者口座による決済も可能にするためにコメントアウト
        // 基本的に、自分の口座のオーソリを他者に与えても得しないので、
        // これが問題になるとすれば、本当にただサービスを荒らしたい悪質な攻撃のみ、ではある
        // if (transaction.agent.id !== agentId) {
        //     throw new factory.errors.Forbidden('A specified transaction is not yours.');
        // }

        // GMOショップ情報取得
        const movieTheater = await repos.seller.findById({
            id: transaction.seller.id
        });

        // 承認アクションを開始する
        const actionAttributes: factory.cinerino.action.authorize.paymentMethod.creditCard.IAttributes = {
            project: transaction.project,
            typeOf: factory.actionType.AuthorizeAction,
            object: params.object,
            agent: transaction.agent,
            recipient: transaction.seller,
            purpose: { typeOf: transaction.typeOf, id: transaction.id }
        };
        const action = await repos.action.start(actionAttributes);

        // GMOオーソリ取得
        let creditCardPaymentAccepted: factory.seller.IPaymentAccepted<factory.cinerino.paymentMethodType.CreditCard>;
        let orderId: string;
        let entryTranArgs: GMO.services.credit.IEntryTranArgs;
        let entryTranResult: GMO.services.credit.IEntryTranResult;
        let execTranArgs: GMO.services.credit.IExecTranArgs;
        let execTranResult: GMO.services.credit.IExecTranResult;
        let searchTradeResult: GMO.services.credit.ISearchTradeResult | undefined;

        if (movieTheater.paymentAccepted === undefined) {
            throw new factory.errors.Argument('transaction', 'Credit card payment not accepted.');
        }
        creditCardPaymentAccepted = <factory.seller.IPaymentAccepted<factory.cinerino.paymentMethodType.CreditCard>>
            movieTheater.paymentAccepted.find(
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

        const creditCardService = new GMO.service.Credit({ endpoint: project.settings.gmo.endpoint });

        try {
            // GMOオーダーIDはカスタム指定可能
            orderId = (params.object.orderId !== undefined) ? params.object.orderId : generateOrderId({
                project: params.project,
                transaction: params.purpose
            });

            entryTranArgs = {
                shopId: creditCardPaymentAccepted.gmoInfo.shopId,
                shopPass: creditCardPaymentAccepted.gmoInfo.shopPass,
                orderId: orderId,
                jobCd: GMO.utils.util.JobCd.Auth,
                amount: params.object.amount
            };

            entryTranResult = await creditCardService.entryTran(entryTranArgs);
            debug('entryTranResult:', entryTranResult);

            const creditCard = params.object.creditCard;
            execTranArgs = {
                accessId: entryTranResult.accessId,
                accessPass: entryTranResult.accessPass,
                orderId: orderId,
                method: params.object.method,
                siteId: project.settings.gmo.siteId,
                sitePass: project.settings.gmo.sitePass,
                cardNo: (<IUncheckedCardRaw>creditCard).cardNo,
                cardPass: (<IUncheckedCardRaw>creditCard).cardPass,
                expire: (<IUncheckedCardRaw>creditCard).expire,
                token: (<IUncheckedCardTokenized>creditCard).token,
                memberId: (<IUnauthorizedCardOfMember>creditCard).memberId,
                cardSeq: (<IUnauthorizedCardOfMember>creditCard).cardSeq,
                seqMode: GMO.utils.util.SeqMode.Physics
            };

            execTranResult = await creditCardService.execTran(execTranArgs);
            debug('execTranResult:', execTranResult);
        } catch (error) {
            debug(error);
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
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
            }

            throw error;
        }

        try {
            // ベストエフォートでクレジットカード詳細情報を取得
            searchTradeResult = await creditCardService.searchTrade({
                shopId: creditCardPaymentAccepted.gmoInfo.shopId,
                shopPass: creditCardPaymentAccepted.gmoInfo.shopPass,
                orderId: orderId
            });
        } catch (error) {
            // no op
        }

        // アクションを完了
        debug('ending authorize action...');

        const result: factory.cinerino.action.authorize.paymentMethod.creditCard.IResult = {
            accountId: (searchTradeResult !== undefined) ? searchTradeResult.cardNo : '',
            amount: params.object.amount,
            paymentMethod: factory.paymentMethodType.CreditCard,
            paymentStatus: factory.cinerino.paymentStatusType.PaymentDue,
            paymentMethodId: orderId,
            name: (typeof params.object.name === 'string') ? params.object.name : String(factory.paymentMethodType.CreditCard),
            totalPaymentDue: {
                typeOf: 'MonetaryAmount',
                currency: factory.priceCurrency.JPY,
                value: params.object.amount
            },
            additionalProperty: (Array.isArray(params.object.additionalProperty)) ? params.object.additionalProperty : [],
            entryTranArgs: entryTranArgs,
            entryTranResult: entryTranResult,
            execTranArgs: execTranArgs,
            execTranResult: execTranResult,
            ...{ price: params.object.amount }
        };

        return <Promise<factory.cinerino.action.authorize.paymentMethod.creditCard.IAction>>
            repos.action.complete({ typeOf: action.typeOf, id: action.id, result: result });
    };
}

/**
 * GMOオーダーIDを生成する
 */
export function generateOrderId(params: {
    project: { id: string };
    transaction: { id: string };
}) {
    // tslint:disable-next-line:no-magic-numbers
    const projectId = `${params.project.id}---`.slice(0, 3)
        .toUpperCase();
    const dateTime = moment()
        .tz('Asia/Tokyo')
        .format('YYMMDDhhmmssSSS');
    // tslint:disable-next-line:no-magic-numbers
    const transactionId = params.transaction.id.slice(-6);

    return util.format(
        '%s%s%s',
        projectId, // プロジェクトIDの頭数文字
        dateTime,
        transactionId
    );
}

export function voidTransaction(params: {
    project: { id: string };
    agent: { id: string };
    id: string;
    purpose: factory.cinerino.action.authorize.paymentMethod.any.IPurpose;
}) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        transaction: TransactionRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (project.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (project.settings.gmo === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const transaction = await repos.transaction.findInProgressById({
            typeOf: params.purpose.typeOf,
            id: params.purpose.id
        });

        if (transaction.agent.id !== params.agent.id) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // 取引内のアクションかどうか確認
        let action = await repos.action.findById({ typeOf: factory.actionType.AuthorizeAction, id: params.id });
        if (action.purpose.typeOf !== transaction.typeOf || action.purpose.id !== transaction.id) {
            throw new factory.errors.Argument('Transaction', 'Action not found in the transaction');
        }

        action = await repos.action.cancel({ typeOf: factory.actionType.AuthorizeAction, id: params.id });
        const actionResult = <factory.cinerino.action.authorize.paymentMethod.creditCard.IResult>action.result;

        // オーソリ取消
        // 現時点では、ここで失敗したらオーソリ取消をあきらめる
        // GMO混雑エラーはここでも発生する(取消処理でも混雑エラーが発生することは確認済)
        try {
            const creditCardService = new GMO.service.Credit({ endpoint: project.settings.gmo.endpoint });
            await creditCardService.alterTran({
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

/**
 * クレジットカードオーソリ取消
 */
export function cancelCreditCardAuth(params: factory.cinerino.task.IData<factory.taskName.CancelCreditCard>) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({ typeOf: factory.transactionType.PlaceOrder, id: params.transactionId });
        const projectId = (transaction.project !== undefined) ? transaction.project.id : <string>process.env.PROJECT_ID;
        const project = await repos.project.findById({ id: projectId });
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (project.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (project.settings.gmo === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const creditCardService = new GMO.service.Credit({ endpoint: project.settings.gmo.endpoint });

        // クレジットカード仮売上アクションを取得
        const authorizeActions = <factory.cinerino.action.authorize.paymentMethod.creditCard.IAction[]>
            await repos.action.searchByPurpose({
                typeOf: factory.actionType.AuthorizeAction,
                purpose: {
                    typeOf: factory.transactionType.PlaceOrder,
                    id: params.transactionId
                }
            })
                .then((actions) => actions
                    .filter((a) => a.object.typeOf === factory.paymentMethodType.CreditCard)
                    .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                );
        await Promise.all(authorizeActions.map(async (action) => {
            if (action.result !== undefined) {
                debug('calling alterTran...');
                await creditCardService.alterTran({
                    shopId: action.result.entryTranArgs.shopId,
                    shopPass: action.result.entryTranArgs.shopPass,
                    accessId: action.result.execTranArgs.accessId,
                    accessPass: action.result.execTranArgs.accessPass,
                    jobCd: GMO.utils.util.JobCd.Void,
                    amount: action.result.entryTranArgs.amount
                });
                await repos.action.cancel({ typeOf: action.typeOf, id: action.id });
            }
        }));

        // 失敗したら取引状態確認してどうこう、という処理も考えうるが、
        // GMOはapiのコール制限が厳しく、下手にコールするとすぐにクライアントサイドにも影響をあたえてしまう
        // リトライはタスクの仕組みに含まれているので失敗してもここでは何もしない
    };
}
