// tslint:disable:no-implicit-dependencies

/**
 * stock service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
import * as ttts from '../index';

let sandbox: sinon.SinonSandbox;
let existingTransaction: any;

before(() => {
    sandbox = sinon.sandbox.create();
    existingTransaction = {
        id: '123',
        object: {
            customerContact: {
                telephone: '+819012345678'
            },
            authorizeActions: [
                {
                    id: 'actionId',
                    actionStatus: 'CompletedActionStatus',
                    purpose: {
                        typeOf: 'SeatReservation'
                    },
                    result: {
                        price: 123,
                        acceptedOffers: [
                            {
                                price: 123,
                                itemOffered: {
                                    reservedTicket: {}
                                }
                            },
                            {
                                price: 456,
                                itemOffered: {
                                    reservedTicket: {}
                                }
                            }
                        ],
                        updTmpReserveSeatArgs: {
                            theaterCode: '123'
                        },
                        updTmpReserveSeatResult: {
                            tmpReserveNum: 123
                        }
                    }
                }
            ]
        },
        result: {
            order: {
                acceptedOffers: [
                    {
                        price: 123,
                        itemOffered: {
                            reservedTicket: {}
                        }
                    },
                    {
                        price: 456,
                        itemOffered: {
                            reservedTicket: {}
                        }
                    }
                ],
                price: 123
            },
            ownershipInfos: [{}, {}]
        }
    };
});

describe('cancelSeatReservationAuth()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引に座席予約が存在すれば、仮予約解除が実行されるはず', async () => {
        const authorizeActions = [
            {
                id: 'actionId',
                actionStatus: ttts.factory.actionStatusType.CompletedActionStatus,
                purpose: {
                    typeOf: ttts.factory.action.authorize.authorizeActionPurpose.SeatReservation
                },
                result: {
                    updTmpReserveSeatArgs: {},
                    updTmpReserveSeatResult: {}
                }
            }
        ];
        const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
        const stockRepo = new ttts.repository.Stock(ttts.mongoose.connection);
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());

        sandbox.mock(authorizeActionRepo).expects('findByTransactionId').once()
            .withExactArgs(existingTransaction.id).resolves(authorizeActions);

        const result = await ttts.service.stock.cancelSeatReservationAuth(existingTransaction.id)(
            authorizeActionRepo, stockRepo, rateLimitRepo
        );

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('transferSeatReservation()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('COA未本予約であれば、本予約が実行されるはず', async () => {
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withArgs(existingTransaction.id).resolves(existingTransaction);
        // sandbox.mock(ttts.COA.services.reserve).expects('stateReserve').once()
        //     .withExactArgs({
        //         theaterCode: '123',
        //         reserveNum: 123,
        //         telNum: '09012345678' // 電話番号は数字のみで本予約されるはず
        //     }).resolves(null);
        // sandbox.mock(ttts.COA.services.reserve).expects('updReserve').once()
        //     // 予約金額はOrderのpriceのはず
        //     .withArgs(sinon.match({ reserveAmount: existingTransaction.result.order.price }))
        //     .resolves();

        const result = await ttts.service.stock.transferSeatReservation(
            existingTransaction.id
        )(transactionRepo, reservationRepo);

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('取引に座席予約が存在しなければ、本予約は実行されないはず', async () => {
        const transaction = {
            id: '123',
            object: {
                authorizeActions: []
            }
        };
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withArgs(transaction.id).resolves(transaction);
        // sandbox.mock(ttts.COA.services.reserve).expects('stateReserve').never();
        // sandbox.mock(ttts.COA.services.reserve).expects('updReserve').never();

        const result = await ttts.service.stock.transferSeatReservation(
            transaction.id
        )(transactionRepo, reservationRepo).catch((err) => err);

        assert(result instanceof ttts.factory.errors.NotImplemented);
        sandbox.verify();
    });

    it('座席予約があるにも関わらず購入者情報がなければ、エラーになるはず', async () => {
        const transaction = {
            id: '123',
            object: {
                authorizeActions: [
                    {
                        id: 'actionId',
                        actionStatus: 'CompletedActionStatus',
                        purpose: {
                            typeOf: 'SeatReservation'
                        },
                        result: {
                            updTmpReserveSeatArgs: {},
                            updTmpReserveSeatResult: {}
                        }
                    }
                ]
            },
            result: {
                order: {
                    acceptedOffers: []
                }
            }
        };
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withArgs(transaction.id).resolves(transaction);
        // sandbox.mock(ttts.COA.services.reserve).expects('stateReserve').never();
        // sandbox.mock(ttts.COA.services.reserve).expects('updReserve').never();

        const transferSeatReservationError = await ttts.service.stock.transferSeatReservation(
            transaction.id
        )(transactionRepo, reservationRepo).catch((err) => err);

        assert(transferSeatReservationError instanceof ttts.factory.errors.Argument);
        sandbox.verify();
    });
});
