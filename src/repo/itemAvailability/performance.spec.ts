// tslint:disable:no-implicit-dependencies

/**
 * パフォーマンス在庫状況リポジトリーテスト
 * @ignore
 */

import { errors } from '@motionpicture/ttts-factory';
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

describe('PerformanceAvailabilityRepo', () => {

    describe('findById()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisから保存しているIDであれば値を取得できるはず', async () => {
            const returnedValue = '0';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(redisClient).expects('hget').once().yields(null, returnedValue);
            const id = 'id';

            const result = await repo.findById(id);

            assert.equal(result, parseInt(returnedValue, 10));
            sandbox.verify();
        });

        it('Redisからエラーをもらえればエラーとなるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(redisClient).expects('hget').once().yields(err);
            const id = 'id';

            const result = await repo.findById(id).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisからnullをもらえればエラーになるはず', async () => {
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(redisClient).expects('hget').once().yields(null, null);
            const id = 'id';

            const result = await repo.findById(id).catch((e) => e);

            assert(result instanceof errors.NotFound);
            sandbox.verify();
        });
    });

    describe('store()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければエラーなしはず', async () => {
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(null, null);

            const testData = [{ id: 'id', remainingAttendeeCapacity: 1 }];
            const result = await repo.store(<any>testData, 0);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('Redisからエラーがあればエラーとなるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(err, null);

            const testData = [{ id: 'id', remainingAttendeeCapacity: 1 }];
            const result = await repo.store(<any>testData, 0).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });
    });

    describe('findAll()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければデータを取得できるはず', async () => {
            const testObject = 'test';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(null, testObject);

            const result = await repo.findAll();

            assert.equal(result, testObject);
            sandbox.verify();
        });

        it('Redisからエラーをもらえればエラーになるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(err);

            const result = await repo.findAll().catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisからnullをもらえれば空のオブジェクトをもらえるはず', async () => {
            const redisClient = redis.createClient();
            const repo = new ttts.repository.itemAvailability.Performance(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(null, null);

            const result = await repo.findAll();

            assert.deepEqual(result, {});
            sandbox.verify();
        });
    });
});
