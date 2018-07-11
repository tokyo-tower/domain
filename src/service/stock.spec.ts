// tslint:disable:no-implicit-dependencies

/**
 * stock service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
import * as ttts from '../index';

// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

let sandbox: sinon.SinonSandbox;
// let existingTransaction: any;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('stockService', () => {
    describe('cancelSeatReservationAuth()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('取引に座席予約が存在すれば、仮予約解除が実行されるはず', async () => {
            const stockRepo = new ttts.repository.Stock(ttts.mongoose.connection);
            sandbox.mock(stockRepo.stockModel).expects('findOneAndUpdate').withArgs(
                {
                    _id: 'stockId1',
                    availability: 'availability_after1',
                    holder: 'holder1'
                },
                {
                    $set: { availability: 'availability_before1' },
                    $unset: { holder: 1 }
                }
            ).once().chain('exec').resolves();

            const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());
            sandbox.mock(rateLimitRepo).expects('unlock').withArgs({
                // tslint:disable-next-line:no-magic-numbers
                performanceStartDate: new Date(2018, 6, 2),
                ticketTypeCategory: 'category2',
                unitInSeconds: 1
            }).once().resolves();

            const transactionId = 'transactionId';
            const fakeAuthorizeActions = [ {
                actionStatus: ttts.factory.actionStatusType.CompletedActionStatus,
                result: {
                    tmpReservations: [ {
                        rate_limit_unit_in_seconds: 0,
                        stocks: [ {
                            id: 'stockId1',
                            availability_after: 'availability_after1',
                            availability_before: 'availability_before1',
                            holder: 'holder1'
                        } ],
                        ticket_ttts_extension: { category: 'category1' }
                    }, {
                        rate_limit_unit_in_seconds: 1,
                        stocks: [  ],
                        ticket_ttts_extension: { category: 'category2' }
                    } ]
                },
                object: { performance: { start_date: '20180702' } }
            } ];
            const authorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);
            sandbox.mock(authorizeActionRepo).expects('findByTransactionId').once()
                .withExactArgs(transactionId).resolves(fakeAuthorizeActions);

            const result = await ttts.service.stock.cancelSeatReservationAuth(transactionId)(
                authorizeActionRepo, stockRepo, rateLimitRepo
            );

            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    describe('transferSeatReservation()', () => {
        it('正常に実行するはず', async () => {
            const returnedFunc = ttts.service.stock.transferSeatReservation('transactionId');

            const fakeTransactionResult = { result: { eventReservations: [ 'eventReservations' ] } };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transactionRepo).expects('findPlaceOrderById')
                .withExactArgs('transactionId').once().resolves(fakeTransactionResult);

            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            sandbox.mock(reservationRepo).expects('saveEventReservation').withExactArgs('eventReservations').once().resolves();

            const result = await returnedFunc(transactionRepo, reservationRepo);

            assert.equal(result, undefined);
            sandbox.verify();
        });
    });
});
