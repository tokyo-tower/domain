// tslint:disable:no-implicit-dependencies

/**
 * placeOrderInProgress transaction service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as ttts from '../../../../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('action.authorize.creditCard.create()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('GMOが正常であれば、エラーにならないはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const entryTranResult = {};
        const execTranResult = {};
        const action = {
            id: 'actionId',
            agent: agent,
            recipient: seller
        };

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(ttts.GMO.services.credit).expects('entryTran').once().resolves(entryTranResult);
        sandbox.mock(ttts.GMO.services.credit).expects('execTran').once().resolves(execTranResult);
        sandbox.mock(authorizeActionRepo).expects('complete').once().resolves(action);

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            ttts.GMO.utils.util.Method.Lump,
            creditCard
        )(authorizeActionRepo, organizationRepo, transactionRepo);

        assert.deepEqual(result, action);
        sandbox.verify();
    });

    it('所有者の取引でなければ、Forbiddenエラーが投げられるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: {
                id: 'anotherAgentId'
            },
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('start').never();
        sandbox.mock(organizationRepo).expects('findMovieTheaterById').never();
        sandbox.mock(ttts.GMO.services.credit).expects('entryTran').never();
        sandbox.mock(ttts.GMO.services.credit).expects('execTran').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            ttts.GMO.utils.util.Method.Lump,
            creditCard
        )(authorizeActionRepo, organizationRepo, transactionRepo)
            .catch((err) => err);

        assert(result instanceof ttts.factory.errors.Forbidden);
        sandbox.verify();
    });

    it('GMOでエラーが発生すれば、承認アクションを諦めて、エラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = new Error('entryTranResultError');

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(ttts.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(ttts.GMO.services.credit).expects('execTran').never();
        sandbox.mock(authorizeActionRepo).expects('giveUp').once()
            .withArgs(action.id, sinon.match({ message: entryTranResult.message })).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            ttts.GMO.utils.util.Method.Lump,
            creditCard
        )(authorizeActionRepo, organizationRepo, transactionRepo).catch((err) => err);

        assert(result instanceof Error);
        sandbox.verify();
    });

    it('GMO処理でエラーオブジェクトでない例外が発生すれば、承認アクションを諦めて、エラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = 123;

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(ttts.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(ttts.GMO.services.credit).expects('execTran').never();
        sandbox.mock(authorizeActionRepo).expects('giveUp').once()
            .withArgs(action.id, entryTranResult).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            ttts.GMO.utils.util.Method.Lump,
            creditCard
        )(authorizeActionRepo, organizationRepo, transactionRepo).catch((err) => err);

        assert(result instanceof Error);
        sandbox.verify();
    });

    it('GMOで流量制限オーバーエラーが発生すれば、承認アクションを諦めて、ServiceUnavailableエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = new Error('message');
        entryTranResult.name = 'GMOServiceBadRequestError';
        (<any>entryTranResult).errors = [{
            info: 'E92000001'
        }];

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(ttts.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(ttts.GMO.services.credit).expects('execTran').never();
        sandbox.mock(authorizeActionRepo).expects('giveUp').once()
            .withArgs(action.id, sinon.match({ message: entryTranResult.message })).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            ttts.GMO.utils.util.Method.Lump,
            creditCard
        )(authorizeActionRepo, organizationRepo, transactionRepo).catch((err) => err);

        assert(result instanceof ttts.factory.errors.RateLimitExceeded);
        sandbox.verify();
    });

    it('GMOでオーダーID重複エラーが発生すれば、承認アクションを諦めて、AlreadyInUseエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = new Error('message');
        entryTranResult.name = 'GMOServiceBadRequestError';
        (<any>entryTranResult).errors = [{
            info: 'E01040010'
        }];

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(ttts.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(ttts.GMO.services.credit).expects('execTran').never();
        sandbox.mock(authorizeActionRepo).expects('giveUp').once()
            .withArgs(action.id, sinon.match({ message: entryTranResult.message })).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            ttts.GMO.utils.util.Method.Lump,
            creditCard
        )(authorizeActionRepo, organizationRepo, transactionRepo).catch((err) => err);

        assert(result instanceof ttts.factory.errors.AlreadyInUse);
        sandbox.verify();
    });

    it('GMOServiceBadRequestErrorエラーが発生すれば、承認アクションを諦めて、Argumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = new Error('message');
        entryTranResult.name = 'GMOServiceBadRequestError';
        (<any>entryTranResult).errors = [{
            info: 'info'
        }];

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(ttts.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(ttts.GMO.services.credit).expects('execTran').never();
        sandbox.mock(authorizeActionRepo).expects('giveUp').once()
            .withArgs(action.id, sinon.match({ message: entryTranResult.message })).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            ttts.GMO.utils.util.Method.Lump,
            creditCard
        )(authorizeActionRepo, organizationRepo, transactionRepo).catch((err) => err);

        assert(result instanceof ttts.factory.errors.Argument);
        sandbox.verify();
    });
});

describe('action.authorize.creditCard.cancel()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、キャンセルできるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const action = {
            id: 'actionId',
            result: {
                execTranArgs: {},
                entryTranArgs: {}
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('cancel').once()
            .withExactArgs(action.id, transaction.id).resolves(action);
        sandbox.mock(ttts.GMO.services.credit).expects('alterTran').once().resolves();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
            agent.id,
            transaction.id,
            action.id
        )(authorizeActionRepo, transactionRepo);

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('所有者の取引でなければ、Forbiddenエラーが投げられるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const actionId = 'actionId';
        const transaction = {
            id: 'transactionId',
            agent: {
                id: 'anotherAgentId'
            },
            seller: seller
        };

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('cancel').never();
        sandbox.mock(ttts.GMO.services.credit).expects('alterTran').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
            agent.id,
            transaction.id,
            actionId
        )(authorizeActionRepo, transactionRepo).catch((err) => err);

        assert(result instanceof ttts.factory.errors.Forbidden);
        sandbox.verify();
    });

    it('GMOで取消に失敗しても、エラーにならないはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const action = {
            id: 'actionId',
            result: {
                execTranArgs: {},
                entryTranArgs: {}
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };

        const authorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('cancel').once()
            .withExactArgs(action.id, transaction.id).resolves(action);
        sandbox.mock(ttts.GMO.services.credit).expects('alterTran').once().rejects();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
            agent.id,
            transaction.id,
            action.id
        )(authorizeActionRepo, transactionRepo);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
