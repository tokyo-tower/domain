// tslint:disable:no-implicit-dependencies

/**
 * 在庫状況サービスステスト
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
import * as ttts from '../index';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('itemAvailabilityService', () => {
    describe('updatePerformanceAvailabilities()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('正しいパラメーターで機能を実施するはず', async () => {
            // INパラメーター
            const input = {
                // tslint:disable-next-line:no-magic-numbers
                startFrom : new Date(2017, 7, 5),
                // tslint:disable-next-line:no-magic-numbers
                startThrough: new Date(2018, 7, 5),
                ttl: 0
            };
            const returnedFunc = ttts.service.itemAvailability.updatePerformanceAvailabilities(input);

            // mockingパフォーマンスレポジトリー
            const expectedArgs1 = {
                start_date: {
                    $gte: input.startFrom,
                    $lt: input.startThrough
                }
            };
            const fakeResult1 = [0, 1];
            const performRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performRepo.performanceModel)
                .expects('distinct')
                .withArgs('_id', expectedArgs1)
                .once()
                .chain('exec')
                .resolves(fakeResult1);

            // mocking在庫レポジトリー
            const expectedArgs2 = [ {
                    $match: {
                        availability: ttts.factory.itemAvailability.InStock,
                        performance: { $in: fakeResult1 }
                    }
                }, {
                    $group: {
                        _id: '$performance',
                        count: { $sum: 1 }
                    }
                } ];
            const stub = sandbox.stub().yields({}).returns(undefined).onFirstCall().yields({}).returns({ count: 1 });
            const fakeResult2 = { find: stub };
            const stockRepo = new ttts.repository.Stock(ttts.mongoose.connection);
            sandbox.mock(stockRepo.stockModel)
                .expects('aggregate')
                .withArgs(expectedArgs2)
                .once()
                .chain('exec')
                .resolves(fakeResult2);

            // mocking在庫在庫状況レポジトリー
            const expectedArgs3 = [ { id: 0, remainingAttendeeCapacity: 0 }, { id: 1, remainingAttendeeCapacity: 1 } ];
            const redisClient = redis.createClient();
            const performAvailRepo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(performAvailRepo).expects('store').withArgs(expectedArgs3, input.ttl).once().resolves();

            const result = await returnedFunc(stockRepo, performRepo, performAvailRepo);
            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    describe('updatePerformanceOffersAvailability()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('正しいパラメーターで機能を実施するはず', async () => {
            // INパラメーター
            const input = {
                // tslint:disable-next-line:no-magic-numbers
                startFrom : new Date(2017, 7, 5),
                // tslint:disable-next-line:no-magic-numbers
                startThrough: new Date(2018, 7, 5)
            };
            const returnedFunc = ttts.service.itemAvailability.updatePerformanceOffersAvailability(input);

            // mockingパフォーマンスレポジトリー
            const expectedArgs1 = {
                start_date: {
                    $gte: input.startFrom,
                    $lt: input.startThrough
                }
            };
            const fakeResult = {
                id: '0',
                start_date: '20170702',
                ticket_type_group: { ticket_types : [ {
                    ttts_extension: {
                        category: 1,
                        required_seat_num: 1
                    },
                    rate_limit_unit_in_seconds: 3,
                    id: 4
                }, {
                    ttts_extension: {
                        category: 1,
                        required_seat_num: 10
                    },
                    rate_limit_unit_in_seconds: 3,
                    id: 8
                }, {
                    ttts_extension: {
                        category: 1,
                        required_seat_num: 0
                    },
                    rate_limit_unit_in_seconds: 0,
                    id: 9
                } ] }
            };
            const fakeResult1 = [ { toObject: sandbox.stub().returns(fakeResult) } ];
            const performRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performRepo.performanceModel)
                .expects('find')
                .withArgs(expectedArgs1)
                .once()
                .chain('exec')
                .resolves(fakeResult1);

            // mocking在庫レポジトリー
            const expectedArgs2 = [ {
                    $match: {
                        availability: ttts.factory.itemAvailability.InStock,
                        performance: { $in: ['0'] }
                    }
                }, {
                    $group: {
                        _id: '$performance',
                        count: { $sum: 1 }
                    }
                } ];
            const fakeResult2 =  [{ _id: '0', count: 1 } ];
            const stockRepo = new ttts.repository.Stock(ttts.mongoose.connection);
            sandbox.mock(stockRepo.stockModel)
                .expects('aggregate')
                .withArgs(expectedArgs2)
                .once()
                .chain('exec')
                .resolves(fakeResult2);

            // mocking券種カテゴリーレート制限リポジトリー
            const expectedArgs3 = {
                // tslint:disable-next-line:no-magic-numbers
                performanceStartDate: new Date(2017, 6, 2),
                ticketTypeCategory: 1,
                unitInSeconds: 3
            };
            const redisClient = redis.createClient();
            const ticketTypeCategoryRateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            sandbox.mock(ticketTypeCategoryRateLimitRepo).expects('getHolder').withArgs(expectedArgs3).twice().resolves(null);

            // mocking座席予約オファー在庫状況レポジトリー
            const seatReserOfferAvailRepo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(seatReserOfferAvailRepo).expects('save').thrice().resolves();

            const result = await returnedFunc(stockRepo, performRepo, seatReserOfferAvailRepo, ticketTypeCategoryRateLimitRepo);
            assert.equal(result, undefined);
            sandbox.verify();
        });
    });
});
