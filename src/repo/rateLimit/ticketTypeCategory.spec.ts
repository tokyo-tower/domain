// tslint:disable:no-implicit-dependencies

/**
 * パフォーマンス在庫状況リポジトリーテスト
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as ttts from '../../index';
import { IRateLimitKey } from './ticketTypeCategory';

let sandbox: sinon.SinonSandbox;
let testKey: IRateLimitKey;

before(() => {
    sandbox = sinon.sandbox.create();
    testKey = {
        ticketTypeCategory: ttts.factory.ticketTypeCategory.Normal,
        // tslint:disable-next-line:no-magic-numbers
        performanceStartDate: new Date(2018, 7, 4),
        unitInSeconds: 10
    };
});

describe('TicketTypeCategoryRateLimitRepo', () => {

    describe('lock()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisから期待される結果をもらえればエラーなしはず', async () => {
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const testResult = [1];
            const repo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(null, testResult);

            const holder = 'holder';
            const result = await repo.lock(testKey, holder);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('Redisから不測の結果をもらえればエラーとなるはず', async () => {
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const testResult = [0];
            const repo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(null, testResult);

            const holder = 'holder';
            const result = await repo.lock(testKey, holder).catch((e) => e);

            assert(result instanceof ttts.factory.errors.RateLimitExceeded);
            sandbox.verify();
        });

        it('Redisからエラーがあればエラーとなるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(err, null);

            const holder = 'holder';
            const result = await repo.lock(testKey, holder).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });
    });

    describe('unlock()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければエラーなしはず', async () => {
            const redisClient = redis.createClient();
            const repo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            sandbox.mock(redisClient).expects('del').once().yields(null, null);

            const result = await repo.unlock(testKey);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('Redisからエラーがあればエラーとなるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            sandbox.mock(redisClient).expects('del').once().yields(err, null);

            const result = await repo.unlock(testKey).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });
    });

    describe('getHolder()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('Redisからエラーがなければエラーなしはず', async () => {
            const testResult = 'holder';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            sandbox.mock(redisClient).expects('get').once().yields(null, testResult);

            const result = await repo.getHolder(testKey);

            assert.equal(result, testResult);
            sandbox.verify();
        });

        it('Redisからエラーがあればエラーとなるはず', async () => {
            const err = 'error';
            const redisClient = redis.createClient();
            const repo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            sandbox.mock(redisClient).expects('get').once().yields(err, null);

            const result = await repo.getHolder(testKey).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });
    });
});
