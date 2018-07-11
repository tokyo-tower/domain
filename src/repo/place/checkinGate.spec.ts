// tslint:disable:no-implicit-dependencies

/**
 * ゲートチェックリポジトリーテスト
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

describe('CheckinGateRepo', () => {

    describe('store()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければエラーなしはず', async () => {
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.place.CheckinGate(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(null, null);

            const testData = { identifier: 'identifier' };
            const result = await repo.store(<any>testData);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('Redisからエラーがあればエラーとなるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.place.CheckinGate(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(err, null);

            const testData = { identifier: 'identifier' };
            const result = await repo.store(<any>testData).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });
    });

    describe('findAll()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければデータの配列を取得できるはず', async () => {
            const testObj = { identifier: JSON.stringify({ test: 'test' }) };
            const expectedObj = [ { test: 'test' } ];
            const redisClient = redis.createClient();
            const repo = new ttts.repository.place.CheckinGate(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(null, testObj);

            const result = await repo.findAll();

            assert.deepEqual(result, expectedObj);
            sandbox.verify();
        });

        it('Redisからエラーをもらえればエラーになるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.place.CheckinGate(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(err);

            const result = await repo.findAll().catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisからnullをもらえれば空の配列をもらえるはず', async () => {
            const redisClient = redis.createClient();
            const repo = new ttts.repository.place.CheckinGate(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(null, null);

            const result = await repo.findAll();

            assert.deepEqual(result, {});
            sandbox.verify();
        });
    });
});
