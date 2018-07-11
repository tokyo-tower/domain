// tslint:disable:no-implicit-dependencies

/**
 * placeOrderInProgress transaction service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
import * as ttts from '../../../../../index';
import * as StockRepo from '../../../../../repo/stock';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('action.authorize.seatReservation.create()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    // tslint:disable-next-line:max-func-body-length
    it('COAが正常であれば、エラーにならないはず(ムビチケなし)', async () => {
        const agent = {
            id: 'agentId',
            typeOf: 'Person'
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
            coaInfo: {},
            ticket_type_group: {
                ticket_types: [{
                    id: 'ticket_type',
                    ttts_extension: {
                        required_seat_num: 1
                    },
                    rate_limit_unit_in_seconds: 1,
                    charge: 1
                }]
            },
            screen: {
                sections: [{ seats: [{ code: 'seat_code', grade: { additional_charge: 1 } }] }]
            }
        };
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                ticketCode: 'ticketCode'
            },
            ticket_type: 'ticket_type'
        }];
        const object = {
            transactionId: transaction.id,
            offers: offers,
            performance: event
        };
        const action = {
            id: 'actionId'
        };

        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const paymentNoRepo = new ttts.repository.PaymentNo(redis.createClient());
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());
        const stockRepoStub = sandbox.stub(StockRepo, 'MongoRepository');

        const mock = () => {
            sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
                .withExactArgs(transaction.id).resolves(transaction);
            sandbox.mock(performanceRepo).expects('findById').once()
                .withExactArgs(eventIdentifier).resolves(event);
            sandbox.mock(authorizeActionRepo).expects('start').once()
                .withArgs(transaction.seller, transaction.agent, object).resolves(action);
            sandbox.mock(authorizeActionRepo).expects('complete').once().withArgs(action.id).resolves(action);
            sandbox.mock(rateLimitRepo).expects('lock').once().resolves();
            stockRepoStub.returns({
                stockModel: {
                    findOneAndUpdate: () => ({ exec: async () => ({ get: (name: string) => name }) })
                }
            });
        };

        const getResult = () => {
            return ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
                agent.id,
                transaction.id,
                eventIdentifier,
                <any>offers
            )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo);
        };

        mock();
        let result = await getResult();
        assert.deepEqual(result, action);
        sandbox.verify();

        mock();
        event.screen.sections[0].seats[0].grade.additional_charge = 0;
        result = await getResult();
        assert.deepEqual(result, action);
        sandbox.verify();

        mock();
        delete event.ticket_type_group.ticket_types[0].charge;
        result = await getResult();
        assert.deepEqual(result, action);
        sandbox.verify();
    });

    // tslint:disable-next-line:max-func-body-length
    it('予約枚数が指定枚数に達しなかった場合エラーになるはず', async () => {
        const agent = {
            id: 'agentId',
            typeOf: 'Person'
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
            coaInfo: {},
            ticket_type_group: {
                ticket_types: [{
                    id: 'ticket_type',
                    ttts_extension: {
                        required_seat_num: 1
                    },
                    rate_limit_unit_in_seconds: 1,
                    charge: 1
                }]
            },
            screen: {
                sections: [{ seats: [{ code: 'seat_code', grade: { additional_charge: 1 } }] }]
            }
        };
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                ticketCode: 'ticketCode'
            },
            ticket_type: 'ticket_type'
        }];
        const object = {
            transactionId: transaction.id,
            offers: offers,
            performance: event
        };
        const action = {
            id: 'actionId'
        };

        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const paymentNoRepo = new ttts.repository.PaymentNo(redis.createClient());
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());
        const stockRepoStub = sandbox.stub(StockRepo, 'MongoRepository');

        const mock = (lock = true) => {
            sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
                .withExactArgs(transaction.id).resolves(transaction);
            sandbox.mock(performanceRepo).expects('findById').once()
                .withExactArgs(eventIdentifier).resolves(event);
            sandbox.mock(authorizeActionRepo).expects('start').once()
                .withArgs(transaction.seller, transaction.agent, object).resolves(action);
            sandbox.mock(authorizeActionRepo).expects('complete').never().withArgs(action.id).resolves(action);
            if (lock) {
                sandbox.mock(rateLimitRepo).expects('lock').once().resolves();
            } else {
                sandbox.mock(rateLimitRepo).expects('lock').never();
            }
        };

        const getResult = () => {
            return ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
                agent.id,
                transaction.id,
                eventIdentifier,
                <any>offers
            )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo).catch((err) => err);
        };

        mock();
        stockRepoStub.returns({});
        let result = await getResult();
        assert(result instanceof ttts.factory.errors.AlreadyInUse);
        sandbox.verify();

        mock();
        stockRepoStub.returns({
            stockModel: {
                findOneAndUpdate: () => ({ exec: async () => null })
            }
        });
        result = await getResult();
        assert(result instanceof ttts.factory.errors.AlreadyInUse);
        sandbox.verify();

        event.ticket_type_group.ticket_types[0].rate_limit_unit_in_seconds = 0;
        mock(false);
        stockRepoStub.returns({
            stockModel: {
                findOneAndUpdate: () => ({ exec: async () => ({ get: (name: string) => `${name}1` }) })
            }
        });
        result = await getResult();
        assert(result instanceof ttts.factory.errors.AlreadyInUse);
        sandbox.verify();
    });

    it('処理の時、何かエラーが発生すれば予約をキャンセルするはず①', async () => {
        const agent = {
            id: 'agentId',
            typeOf: 'Person'
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
            coaInfo: {},
            ticket_type_group: {
                ticket_types: [{
                    id: 'ticket_type',
                    ttts_extension: {
                        required_seat_num: 0
                    },
                    rate_limit_unit_in_seconds: 1
                }]
            }
        };
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                ticketCode: 'ticketCode'
            },
            ticket_type: 'ticket_type'
        }];
        const object = {
            transactionId: transaction.id,
            offers: offers,
            performance: event
        };
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
        sandbox.mock(authorizeActionRepo).expects('start').once().withArgs(transaction.seller, transaction.agent, object).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').never();
        sandbox.mock(rateLimitRepo).expects('lock').never();
        const error = new Error('error');
        sandbox.mock(paymentNoRepo).expects('publish').once().rejects(error);
        sandbox.mock(authorizeActionRepo).expects('giveUp').once().resolves();
        sandbox.mock(rateLimitRepo).expects('getHolder').once().resolves(transaction.id);
        sandbox.mock(rateLimitRepo).expects('unlock').once().resolves();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
            agent.id,
            transaction.id,
            eventIdentifier,
            <any>offers
        )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo).catch((err) => err);

        assert.deepEqual(result, error);
        sandbox.verify();
    });

    it('処理の時、何かエラーが発生すれば予約をキャンセルするはず②', async () => {
        const agent = {
            id: 'agentId',
            typeOf: 'Person'
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
            coaInfo: {},
            ticket_type_group: {
                ticket_types: [{
                    id: 'ticket_type',
                    ttts_extension: {
                        required_seat_num: 0
                    },
                    rate_limit_unit_in_seconds: 1
                }]
            }
        };
        const offers = [{
            seatSection: 'seatSection',
            seatNumber: 'seatNumber',
            ticketInfo: {
                ticketCode: 'ticketCode'
            },
            ticket_type: 'ticket_type'
        }];
        const object = {
            transactionId: transaction.id,
            offers: offers,
            performance: event
        };
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
        sandbox.mock(authorizeActionRepo).expects('start').once().withArgs(transaction.seller, transaction.agent, object).resolves(action);
        sandbox.mock(authorizeActionRepo).expects('complete').never();
        sandbox.mock(rateLimitRepo).expects('lock').never();
        const error = {};
        sandbox.mock(paymentNoRepo).expects('publish').once().rejects(error);
        sandbox.mock(authorizeActionRepo).expects('giveUp').once().resolves();
        sandbox.mock(rateLimitRepo).expects('getHolder').once().resolves(transaction.id);
        sandbox.mock(rateLimitRepo).expects('unlock').once().resolves();

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
            agent.id,
            transaction.id,
            eventIdentifier,
            <any>offers
        )(transactionRepo, performanceRepo, authorizeActionRepo, paymentNoRepo, rateLimitRepo).catch((err) => err);

        assert.equal(result, error);
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
            },
            ticket_type_group: {
                ticket_types: []
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

    it('購入者が違ったら何もしないはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const transaction = {
            id: 'transactionId',
            agent: {
                id: 'anotherId'
            }
        };

        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').withExactArgs(transaction.id).resolves(transaction);

        const result = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(
            agent.id,
            transaction.id,
            'actionId'
        )(transactionRepo, <any>'authorizeActionRepo', <any>'rateLimitRepo');

        assert.equal(result, undefined);
        sandbox.verify();
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
                tmpReservations: [{
                    rate_limit_unit_in_seconds: 1,
                    ticket_ttts_extension: {},
                    stocks: [{}]
                }],
                updTmpReserveSeatResult: {}
            },
            object: {
                performance: {
                    start_date: '20170102'
                }
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
        sandbox.stub(StockRepo, 'MongoRepository').returns({
            stockModel: {
                findOneAndUpdate: () => ({ exec: async () => null })
            }
        });

        const mock = () => {
            sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
                .withExactArgs(transaction.id).resolves(transaction);
            sandbox.mock(authorizeActionRepo).expects('cancel').once()
                .withExactArgs(action.id, transaction.id).resolves(action);
        };

        const getResult = () => ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(
            agent.id,
            transaction.id,
            action.id
        )(transactionRepo, authorizeActionRepo, rateLimitRepo);

        mock();
        sandbox.mock(rateLimitRepo).expects('getHolder').once().resolves('transactionId');
        sandbox.mock(rateLimitRepo).expects('unlock').once().resolves();
        let result = await getResult();
        assert.equal(result, undefined);
        sandbox.verify();

        mock();
        sandbox.mock(rateLimitRepo).expects('getHolder').once().resolves(null);
        sandbox.mock(rateLimitRepo).expects('unlock').never();
        result = await getResult();
        assert.equal(result, undefined);
        sandbox.verify();

        action.result.tmpReservations[0].rate_limit_unit_in_seconds = 0;
        mock();
        sandbox.mock(rateLimitRepo).expects('getHolder').never();
        sandbox.mock(rateLimitRepo).expects('unlock').never();
        result = await getResult();
        assert.equal(result, undefined);
        sandbox.verify();
    });
});
