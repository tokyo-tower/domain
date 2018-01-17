// tslint:disable:no-implicit-dependencies

/**
 * placeOrderInProgress transaction service test
 * @ignore
 */

import * as waiter from '@motionpicture/waiter-domain';
import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
import * as ttts from '../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('start()', () => {
    beforeEach(() => {
        delete process.env.WAITER_PASSPORT_ISSUER;
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('販売者が存在すれば、開始できるはず', async () => {
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').once().resolves(transaction);

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo);

        assert.deepEqual(result, transaction);
        // assert.equal(result.expires, transaction.expires);
        sandbox.verify();
    });

    it('クライアントユーザーにusernameが存在すれば、会員として開始できるはず', async () => {
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };
        const clientUser = {
            username: 'username'
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').once().resolves(transaction);

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            clientUser: <any>clientUser,
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo);

        assert.deepEqual(result, transaction);
        sandbox.verify();
    });

    it('許可証トークンの検証に成功すれば、開始できるはず', async () => {
        process.env.WAITER_PASSPORT_ISSUER = 'https://example.com';
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };
        const passportToken = 'passportToken';
        const passport = {
            scope: `placeOrderTransaction.${seller.identifier}`,
            iat: 123,
            exp: 123,
            iss: process.env.WAITER_PASSPORT_ISSUER,
            issueUnit: {}
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(waiter.service.passport).expects('verify').once().resolves(passport);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').once().resolves(transaction);

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            passportToken: passportToken,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo);
        assert.deepEqual(result, transaction);
        sandbox.verify();
    });

    it('許可証トークンの検証に失敗すれば、Argumentエラーとなるはず', async () => {
        process.env.WAITER_PASSPORT_ISSUER = 'https://example.com';
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };
        const passportToken = 'passportToken';
        const verifyResult = new Error('verifyError');

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(waiter.service.passport).expects('verify').once().rejects(verifyResult);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').never();

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            passportToken: passportToken,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.Argument);
        sandbox.verify();
    });

    it('許可証の発行者が期待通りでなければ、Argumentエラーとなるはず', async () => {
        process.env.WAITER_PASSPORT_ISSUER = 'https://example.com';
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };
        const passportToken = 'passportToken';
        const passport = {
            scope: `placeOrderTransaction.${seller.id}`,
            iat: 123,
            exp: 123,
            iss: 'invalidIssuer',
            issueUnit: {}
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(waiter.service.passport).expects('verify').once().resolves(passport);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').once().never();

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            passportToken: passportToken,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.Argument);
        sandbox.verify();
    });

    it('許可証がない場合、スコープの指定がなければArgumentNullエラーとなるはず', async () => {
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').never();

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.ArgumentNull);
        sandbox.verify();
    });

    it('許可証がない場合、単位あたりの最大取引数の指定がなければArgumentNullエラーとなるはず', async () => {
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').never();

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.ArgumentNull);
        sandbox.verify();
    });

    it('許可証がない場合、取引数レポジトリーの指定がなければArgumentNullエラーとなるはず', async () => {
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').never();

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo).catch((err) => err);
        console.error(result);
        assert(result instanceof ttts.factory.errors.ArgumentNull);
        sandbox.verify();
    });

    it('取引作成時に何かしらエラーが発生すれば、そのままのエラーになるはず', async () => {
        process.env.WAITER_PASSPORT_ISSUER = 'https://example.com';
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const expires = new Date();
        const startResult = new Error('startError');
        const passportToken = 'passportToken';
        const passport = {
            scope: `placeOrderTransaction.${seller.identifier}`,
            iat: 123,
            exp: 123,
            iss: process.env.WAITER_PASSPORT_ISSUER,
            issueUnit: {}
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(waiter.service.passport).expects('verify').once().resolves(passport);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').once().rejects(startResult);

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: expires,
            passportToken: passportToken,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo).catch((err) => err);
        assert.deepEqual(result, startResult);
        sandbox.verify();
    });

    it('許可証を重複使用しようとすれば、AlreadyInUseエラーとなるはず', async () => {
        process.env.WAITER_PASSPORT_ISSUER = 'https://example.com';
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const expires = new Date();
        const startResult = ttts.mongoose.mongo.MongoError.create({ code: 11000 });
        const passportToken = 'passportToken';
        const passport = {
            scope: `placeOrderTransaction.${seller.identifier}`,
            iat: 123,
            exp: 123,
            iss: process.env.WAITER_PASSPORT_ISSUER,
            issueUnit: {}
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(waiter.service.passport).expects('verify').once().resolves(passport);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').once().rejects(startResult);

        const result = await ttts.service.transaction.placeOrderInProgress.start({
            expires: expires,
            passportToken: passportToken,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.AlreadyInUse);
        sandbox.verify();
    });

    it('取引数制限を超えていれば、RateLimitExceededエラーが投げられるはず', async () => {
        const agentId = 'agentId';
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            identifier: 'sellerIdentifier'
        };
        const transaction = {
            expires: new Date()
        };

        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(organizationRepo).expects('findMovieTheaterById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(transactionRepo).expects('startPlaceOrder').never();

        const startError = await ttts.service.transaction.placeOrderInProgress.start({
            expires: transaction.expires,
            clientUser: <any>{},
            agentId: agentId,
            sellerIdentifier: seller.id,
            purchaserGroup: ttts.factory.person.Group.Customer
        })(transactionRepo, organizationRepo)
            .catch((err) => err);

        assert(startError instanceof ttts.factory.errors.RateLimitExceeded);
        sandbox.verify();
    });
});

describe('setCustomerContact()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が進行中であれば、エラーにならないはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller,
            object: {
            }
        };
        const contact = {
            givenName: 'givenName',
            familyName: 'familyName',
            telephone: '09012345678',
            email: 'john@example.com'
        };

        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(transactionRepo).expects('setCustomerContactOnPlaceOrderInProgress').once()
            .withArgs(transaction.id).resolves();

        const result = await ttts.service.transaction.placeOrderInProgress.setCustomerContact(
            agent.id,
            transaction.id,
            <any>contact
        )(transactionRepo);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('所有者の取引でなければ、Forbiddenエラーが投げられるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: { id: 'anotherAgentId' },
            seller: seller,
            object: {
            }
        };
        const contact = {
            givenName: 'givenName',
            familyName: 'familyName',
            telephone: '09012345678',
            email: 'john@example.com'
        };

        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(transactionRepo).expects('setCustomerContactOnPlaceOrderInProgress').never();

        const result = await ttts.service.transaction.placeOrderInProgress.setCustomerContact(
            agent.id,
            transaction.id,
            <any>contact
        )(transactionRepo).catch((err) => err);

        assert(result instanceof ttts.factory.errors.Forbidden);
        sandbox.verify();
    });

    it('電話番号フォーマットが不適切であれば、Argumentエラーが投げられるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller,
            object: {
            }
        };
        const contact = {
            givenName: 'givenName',
            familyName: 'familyName',
            telephone: '090123456789',
            email: 'john@example.com'
        };

        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').never()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(transactionRepo).expects('setCustomerContactOnPlaceOrderInProgress').never();

        const result = await ttts.service.transaction.placeOrderInProgress.setCustomerContact(
            agent.id,
            transaction.id,
            <any>contact
        )(transactionRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.Argument);
        sandbox.verify();
    });
});

describe('confirm()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('確定条件が整っていれば、確定できるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller,
            object: {
                customerContact: {}
            }
        };
        const creditCardAuthorizeActions = [
            {
                id: 'actionId2',
                actionStatus: 'CompletedActionStatus',
                agent: transaction.agent,
                object: {},
                result: {
                    price: 1234
                },
                endDate: new Date()
            }
        ];
        const seatReservationAuthorizeActions = [
            {
                id: 'actionId1',
                actionStatus: 'CompletedActionStatus',
                agent: transaction.seller,
                object: {},
                result: {
                    updTmpReserveSeatArgs: {},
                    price: 1234
                },
                endDate: new Date()
            }
        ];
        const order = {
            orderNumber: 'orderNumber',
            acceptedOffers: [
                {
                    itemOffered: {
                        reservationFor: { endDate: new Date() },
                        reservedTicket: { ticketToken: 'ticketToken1' }
                    }
                },
                {
                    itemOffered: {
                        reservationFor: { endDate: new Date() },
                        reservedTicket: { ticketToken: 'ticketToken2' }
                    }
                }
            ],
            customer: {
                name: 'name'
            }
        };

        const creditCardAuthorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const seatReservationAuthorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const tokenRepo = new ttts.repository.Token(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(creditCardAuthorizeActionRepo).expects('findByTransactionId').once()
            .withExactArgs(transaction.id).resolves(creditCardAuthorizeActions);
        sandbox.mock(seatReservationAuthorizeActionRepo).expects('findByTransactionId').once()
            .withExactArgs(transaction.id).resolves(seatReservationAuthorizeActions);
        sandbox.mock(ttts.factory.order).expects('createFromPlaceOrderTransaction').once().returns(order);
        sandbox.mock(transactionRepo).expects('confirmPlaceOrder').once().withArgs(transaction.id).resolves();

        const result = await ttts.service.transaction.placeOrderInProgress.confirm({
            agentId: agent.id,
            transactionId: transaction.id,
            paymentMethod: ttts.factory.paymentMethodType.CreditCard
        })(transactionRepo, creditCardAuthorizeActionRepo, seatReservationAuthorizeActionRepo, tokenRepo);

        assert.deepEqual(result, order);
        sandbox.verify();
    });

    it('確定条件が整っていなければ、Argumentエラーになるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller,
            object: {
                customerContact: {}
            }
        };
        const authorizeActions = [
            {
                id: 'actionId1',
                actionStatus: 'CompletedActionStatus',
                agent: transaction.seller,
                object: {},
                result: {
                    updTmpReserveSeatArgs: {},
                    price: 1234
                },
                endDate: new Date()
            },
            {
                id: 'actionId2',
                actionStatus: 'CompletedActionStatus',
                agent: transaction.agent,
                object: {},
                result: {
                    price: 1235
                },
                endDate: new Date()
            }
        ];

        const creditCardAuthorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const seatReservationAuthorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const tokenRepo = new ttts.repository.Token(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(creditCardAuthorizeActionRepo).expects('findByTransactionId').once()
            .withExactArgs(transaction.id).resolves(authorizeActions);
        sandbox.mock(seatReservationAuthorizeActionRepo).expects('findByTransactionId').once()
            .withExactArgs(transaction.id).resolves(authorizeActions);
        sandbox.mock(ttts.factory.order).expects('createFromPlaceOrderTransaction').never();
        sandbox.mock(transactionRepo).expects('confirmPlaceOrder').never();

        const result = await ttts.service.transaction.placeOrderInProgress.confirm({
            agentId: agent.id,
            transactionId: transaction.id,
            paymentMethod: ttts.factory.paymentMethodType.CreditCard
        })(transactionRepo, creditCardAuthorizeActionRepo, seatReservationAuthorizeActionRepo, tokenRepo)
            .catch((err) => err);

        assert(result instanceof ttts.factory.errors.Argument);
        sandbox.verify();
    });

    it('所有者の取引でなければ、Forbiddenエラーが投げられるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: { id: 'anotherAgentId' },
            seller: seller,
            object: {
            }
        };

        const creditCardAuthorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
        const seatReservationAuthorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const tokenRepo = new ttts.repository.Token(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(creditCardAuthorizeActionRepo).expects('findByTransactionId').never();
        sandbox.mock(seatReservationAuthorizeActionRepo).expects('findByTransactionId').never();
        sandbox.mock(ttts.factory.order).expects('createFromPlaceOrderTransaction').never();
        sandbox.mock(transactionRepo).expects('confirmPlaceOrder').never();

        const result = await ttts.service.transaction.placeOrderInProgress.confirm({
            agentId: agent.id,
            transactionId: transaction.id,
            paymentMethod: ttts.factory.paymentMethodType.CreditCard
        })(transactionRepo, creditCardAuthorizeActionRepo, seatReservationAuthorizeActionRepo, tokenRepo)
            .catch((err) => err);

        assert(result instanceof ttts.factory.errors.Forbidden);
        sandbox.verify();
    });
});
