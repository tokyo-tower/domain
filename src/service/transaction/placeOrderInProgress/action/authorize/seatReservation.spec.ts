// tslint:disable:no-implicit-dependencies

/**
 * placeOrderInProgress transaction service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
import * as ttts from '../../../../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('action.authorize.seatReservation.create()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('COAが正常であれば、エラーにならないはず(ムビチケなし)', async () => {
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
            seller: seller
        };
        const eventIdentifier = 'eventIdentifier';
        const event = {
            identifier: eventIdentifier,
            coaInfo: {}
        };
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                ticketCode: 'ticketCode'
            }
        }];
        const action = {
            id: 'actionId'
        };

        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const paymentNoRepo = new ttts.repository.PaymentNo(redis.createClient());
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once().withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(performanceRepo).expects('findById').once()
            .withExactArgs(eventIdentifier).resolves(event);
        sandbox.mock(authorizeActionRepo).expects('start').once().withArgs(transaction.seller, transaction.agent).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').once().withArgs(action.id).resolves(action);

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
            agent.id,
            transaction.id,
            eventIdentifier,
            <any>offers
        )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo);

        assert.deepEqual(result, action);
        sandbox.verify();
    });

    it('メガネ代込みを指定された場合、メガネ代込みの承認アクションを取得できるはず(ムビチケなし)', async () => {
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
            seller: seller
        };
        const eventIdentifier = 'eventIdentifier';
        const event = {
            identifier: eventIdentifier,
            coaInfo: {}
        };
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                ticketCode: 'ticketCode',
                addGlasses: 100
            }
        }];
        const salesTickets = [{
            ticketCode: 'ticketCode',
            salePrice: 1000,
            addGlasses: 100
        }];
        const reserveSeatsTemporarilyResult = <any>{};
        const action = {
            id: 'actionId'
        };

        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const paymentNoRepo = new ttts.repository.PaymentNo(redis.createClient());
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once().withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(performanceRepo).expects('findById').once().withExactArgs(eventIdentifier).resolves(event);
        sandbox.mock(authorizeActionRepo).expects('start').once().withArgs(transaction.seller, transaction.agent).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').once().withArgs(
            action.id,
            {
                price: salesTickets[0].salePrice + salesTickets[0].addGlasses,
                updTmpReserveSeatArgs: sinon.match.any,
                updTmpReserveSeatResult: reserveSeatsTemporarilyResult
            }
        ).resolves(action);

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
            agent.id,
            transaction.id,
            eventIdentifier,
            <any>offers
        )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo);

        assert.deepEqual(result, action);
        sandbox.verify();
    });

    it('COAが正常であれば、エラーにならないはず(会員の場合)', async () => {
        const agent = {
            id: 'agentId',
            memberOf: {} // 会員
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const eventIdentifier = 'eventIdentifier';
        const event = {
            identifier: eventIdentifier,
            coaInfo: {
                theaterCode: 'theaterCode'
            }
        };
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                ticketCode: 'ticketCode'
            }
        }];
        const action = {
            id: 'actionId'
        };

        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const paymentNoRepo = new ttts.repository.PaymentNo(redis.createClient());
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once().withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(performanceRepo).expects('findById').once().withExactArgs(eventIdentifier).resolves(event);
        // 会員と非会員で2回呼ばれるはず
        sandbox.mock(authorizeActionRepo).expects('start').once().withArgs(transaction.seller, transaction.agent).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').once().withArgs(action.id).resolves(action);

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
            agent.id,
            transaction.id,
            eventIdentifier,
            <any>offers
        )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo);

        assert.deepEqual(result, action);
        sandbox.verify();
    });

    it('存在しないチケットコードであれば、エラーになるはず(ムビチケなし)', async () => {
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
            seller: seller
        };
        const eventIdentifier = 'eventIdentifier';
        const event = {
            identifier: eventIdentifier,
            coaInfo: {
                theaterCode: 'theaterCode'
            }
        };
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                ticketCode: 'invalidTicketCode'
            }
        }];

        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const paymentNoRepo = new ttts.repository.PaymentNo(redis.createClient());
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once().withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(performanceRepo).expects('findById').once().withExactArgs(eventIdentifier).resolves(event);
        sandbox.mock(authorizeActionRepo).expects('start').never();
        sandbox.mock(authorizeActionRepo).expects('complete').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
            agent.id,
            transaction.id,
            eventIdentifier,
            <any>offers
        )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.NotFound);
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
            agent: {
                id: 'anotherAgentId'
            },
            seller: seller
        };
        const eventIdentifier = 'eventIdentifier';
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                mvtkSalesPrice: 123
            }
        }];

        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const paymentNoRepo = new ttts.repository.PaymentNo(redis.createClient());
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once().withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(performanceRepo).expects('findById').never();
        sandbox.mock(authorizeActionRepo).expects('start').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
            agent.id,
            transaction.id,
            eventIdentifier,
            <any>offers
        )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo).catch((err) => err);

        assert(result instanceof ttts.factory.errors.Forbidden);
        sandbox.verify();
    });
});

describe('action.authorize.seatReservation.cancel()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、キャンセルできるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const action = {
            id: 'actionId',
            result: {
                updTmpReserveSeatArgs: {},
                updTmpReserveSeatResult: {}
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };

        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('cancel').once()
            .withExactArgs(action.id, transaction.id).resolves(action);

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(
            agent.id,
            transaction.id,
            action.id
        )(transactionRepo, authorizeActionRepo, rateLimitRepo);

        assert.equal(result, undefined);
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
        const actionId = 'actionId';
        const transaction = {
            id: 'transactionId',
            agent: {
                id: 'anotherAgentId'
            },
            seller: seller
        };

        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('cancel').never();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(
            agent.id,
            transaction.id,
            actionId
        )(transactionRepo, authorizeActionRepo, rateLimitRepo).catch((err) => err);
        console.error(result);

        assert(result instanceof ttts.factory.errors.Forbidden);
        sandbox.verify();
    });
});
