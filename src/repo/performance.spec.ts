// tslint:disable:no-implicit-dependencies

/**
 * パフォーマンスリポジトリーテスト
 * @ignore
 */

import { errors } from '@motionpicture/ttts-factory';
import { } from 'mocha';
import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as ttts from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('PerformanceRepo', () => {

    describe('findById()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('MongoDBから保存しているIDであればオブジェクトを取得できるはず', async () => {
            const id = 'id';

            const repo = new ttts.repository.Performance(ttts.mongoose.connection);
            const doc = new repo.performanceModel();

            sandbox.mock(repo.performanceModel).expects('findById').once().chain('exec').resolves(doc);

            const result = await repo.findById(id);

            assert.equal(typeof result, 'object');
            sandbox.verify();
        });

        it('MongoDBから保存していないIDであればエラーになるはず', async () => {
            const id = 'id';

            const repo = new ttts.repository.Performance(ttts.mongoose.connection);

            sandbox.mock(repo.performanceModel).expects('findById').once().chain('exec').resolves(null);

            const result = await repo.findById(id).catch((err) => err);
            assert(result instanceof ttts.factory.errors.NotFound);

            sandbox.verify();
        });
    });

    describe('saveIfNotExists()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('findByIdAndUpdateを呼ぶはず', async () => {
            const repo = new ttts.repository.Performance(ttts.mongoose.connection);
            const doc = new repo.performanceModel();

            sandbox.mock(repo.performanceModel).expects('findByIdAndUpdate').once().chain('exec');

            const result = await repo.saveIfNotExists(<any>doc);
            assert.equal(result, undefined);

            sandbox.verify();
        });
    });
});

describe('PerformanceWithAggregationRepo', () => {

    describe('findById()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisから保存しているIDであればオブジェクトを取得できるはず', async () => {
            const testObject = {
                name: 'test',
                content: 'none'
            };
            const redisClient = redis.createClient();
            const repo = new ttts.repository.PerformanceWithAggregation(redisClient);
            // tslint:disable-next-line:no-magic-numbers
            sandbox.mock(redisClient).expects('hget').once().callsArgWith(2, null, JSON.stringify(testObject));
            const id = 'id';

            const result = await repo.findById(id);

            assert.deepEqual(result, testObject);
            sandbox.verify();
        });

        it('Redisからエラーをもらえればエラーになるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.PerformanceWithAggregation(redisClient);
            // tslint:disable-next-line:no-magic-numbers
            sandbox.mock(redisClient).expects('hget').once().callsArgWith(2, err);
            const id = 'id';

            const result = await repo.findById(id).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisからnullをもらえればエラーになるはず', async () => {
            const redisClient = redis.createClient();
            const repo = new ttts.repository.PerformanceWithAggregation(redisClient);
            // tslint:disable-next-line:no-magic-numbers
            sandbox.mock(redisClient).expects('hget').once().callsArgWith(2, null, null);
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
            const repo = new ttts.repository.PerformanceWithAggregation(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().callsArgWith(0, null, null);

            const testData = {  };
            const result = await repo.store([<any>testData], 0);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('Redisからエラーがあればエラーになるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.PerformanceWithAggregation(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().callsArgWith(0, err, null);

            const testData = {  };
            const result = await repo.store(<any>[testData], 0).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });
    });

    describe('findAll()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければデータの配列を取得できるはず', async () => {
            const testObject: { [key: string]: string } = { a: JSON.stringify({ name: 'test', content: 'none' }) };
            const redisClient = redis.createClient();
            const repo = new ttts.repository.PerformanceWithAggregation(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(null, testObject);

            const result = await repo.findAll();

            assert.deepEqual(result, Object.keys(testObject).map((id: string) => JSON.parse(testObject[id])));
            sandbox.verify();
        });

        it('Redisからエラーをもらえればエラーになるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.PerformanceWithAggregation(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(err);

            const result = await repo.findAll().catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisからnullをもらえれば空の配列をもらえるはず', async () => {
            const redisClient = redis.createClient();
            const repo = new ttts.repository.PerformanceWithAggregation(redisClient);
            sandbox.mock(redisClient).expects('hgetall').once().yields(null, null);

            const result = await repo.findAll();

            assert.deepEqual(result, []);
            sandbox.verify();
        });
    });
});
