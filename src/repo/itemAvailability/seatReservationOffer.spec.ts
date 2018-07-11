// tslint:disable:no-implicit-dependencies

/**
 * 座席予約オファーの在庫状況リポジトリーテスト
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as ttts from '../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('SeatReservationOfferAvailabilityRepo', () => {

    describe('findById()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisから保存しているIDであれば値を取得できるはず', async () => {
            const returnedValue = '10';
            const expectedValue = 10;
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(redisClient).expects('hget').once().yields(null, returnedValue);

            const performanceId = 'performanceId';
            const ticketTypeId = 'ticketTypeId';
            const result = await repo.findById(performanceId, ticketTypeId);

            assert.equal(result, expectedValue);
            sandbox.verify();
        });

        it('Redisからエラーをもらえればエラーとなるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(redisClient).expects('hget').once().yields(err);

            const performanceId = 'performanceId';
            const ticketTypeId = 'ticketTypeId';
            const result = await repo.findById(performanceId, ticketTypeId).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisからnullをもらえればエラーになるはず', async () => {
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(redisClient).expects('hget').once().yields(null, null);

            const performanceId = 'performanceId';
            const ticketTypeId = 'ticketTypeId';
            const result = await repo.findById(performanceId, ticketTypeId);

            assert.equal(result, 0);
            sandbox.verify();
        });
    });

    describe('save()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければエラーなしはず', async () => {
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(null, null);

            const performanceId = 'performanceId';
            const ticketTypeId = 'ticketTypeId';
            const availNum = 1;
            const result = await repo.save(performanceId, ticketTypeId, availNum);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('Redisからエラーがあればエラーとなるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(err, null);

            const performanceId = 'performanceId';
            const ticketTypeId = 'ticketTypeId';
            const availNum = 1;
            const result = await repo.save(performanceId, ticketTypeId, availNum).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });
    });

    describe('findByPerformance()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければデータを取得できるはず', async () => {
            const testObject = { test: '0' };
            const expectedObject = { test: 0 };
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(null, testObject);

            const performanceId = 'performanceId';
            const result = await repo.findByPerformance(performanceId);

            assert.deepEqual(result, expectedObject);
            sandbox.verify();
        });

        it('Redisからエラーをもらえればエラーになるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(err);

            const performanceId = 'performanceId';
            const result = await repo.findByPerformance(performanceId).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisからnullをもらえれば空のオブジェクトをもらえるはず', async () => {
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(null, null);

            const performanceId = 'performanceId';
            const result = await repo.findByPerformance(performanceId);

            assert.deepEqual(result, {});
            sandbox.verify();
        });
    });
});
