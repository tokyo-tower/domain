// tslint:disable:no-implicit-dependencies

/**
 * トークンリポジトリーテスト
 * @ignore
 */

import * as jwt from 'jsonwebtoken';
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

describe('PerformanceWithAggregationRepo', () => {

    describe('createPrintToken()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('JWTでエラーが発生すれば、そのままエラーとなるはず', async () => {
            const testObject = {  };
            const err = new Error();

            sandbox.mock(jwt).expects('sign').once().yields(err);
            const redisClient = redis.createClient();
            const repo = new ttts.repository.Token(redisClient);

            const result = await repo.createPrintToken(<any>testObject).catch((e) => e);

            assert(result instanceof Error);
            sandbox.verify();
        });

        it('Redisでエラーが発生すれば、そのままエラーとなるはず', async () => {
            const testObject = {  };
            const token = '';
            const err = 'err';

            sandbox.mock(jwt).expects('sign').once().yields(null, token);
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.Token(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(err, null);

            const result = await repo.createPrintToken(<any>testObject).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisから不測の結果をもらえれば、エラーとなるはず', async () => {
            const testObject = {  };
            const token = '';
            const data = [0];

            sandbox.mock(jwt).expects('sign').once().yields(null, token);
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.Token(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(null, data);

            const result = await repo.createPrintToken(<any>testObject).catch((e) => e);

            assert(result instanceof ttts.factory.errors.AlreadyInUse);
            sandbox.verify();
        });

        it('Redisから期待される結果をもらえれば、トークンを取得できるはず', async () => {
            const testObject = {  };
            const token = '';
            const data = [1];

            sandbox.mock(jwt).expects('sign').once().yields(null, token);
            const redisClient = redis.createClient();
            const multi = redisClient.multi();
            const repo = new ttts.repository.Token(redisClient);
            sandbox.mock(redisClient).expects('multi').once().returns(multi);
            sandbox.mock(multi).expects('exec').once().yields(null, data);

            const result = await repo.createPrintToken(<any>testObject);

            assert.equal(result, token);
            sandbox.verify();
        });
    });

    describe('verifyPrintToken()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('JWTでエラーが発生すれば、そのままエラーとなるはず', async () => {
            const err = new Error();

            sandbox.mock(jwt).expects('verify').once().yields(err);
            const redisClient = redis.createClient();
            const repo = new ttts.repository.Token(redisClient);

            const token = '';
            const result = await repo.verifyPrintToken(token).catch((e) => e);

            assert(result instanceof Error);
            sandbox.verify();
        });

        it('Redisでエラーが発生すれば、そのままエラーとなるはず', async () => {
            const decoded = {  };
            const err = 'err';

            sandbox.mock(jwt).expects('verify').once().yields(null, decoded);
            const redisClient = redis.createClient();
            const repo = new ttts.repository.Token(redisClient);
            sandbox.mock(redisClient).expects('get').once().yields(err, null);

            const token = '';
            const result = await repo.verifyPrintToken(token).catch((e) => e);

            assert.equal(result, err);
            sandbox.verify();
        });

        it('Redisから不測の結果をもらえれば、エラーとなるはず', async () => {
            const decoded = {  };
            const data = '';

            sandbox.mock(jwt).expects('verify').once().yields(null, decoded);
            const redisClient = redis.createClient();
            const repo = new ttts.repository.Token(redisClient);
            sandbox.mock(redisClient).expects('get').once().yields(null, data);

            const token = '';
            const result = await repo.verifyPrintToken(token).catch((e) => e);

            assert(result instanceof ttts.factory.errors.NotFound);
            sandbox.verify();
        });

        it('Redisから期待される結果をもらえれば、復号されたオブジェクトを取得できるはず', async () => {
            const decoded = { object: 'test' };
            const data = 'not important';

            sandbox.mock(jwt).expects('verify').once().yields(null, decoded);
            const redisClient = redis.createClient();
            const repo = new ttts.repository.Token(redisClient);
            sandbox.mock(redisClient).expects('get').once().yields(null, data);

            const token = 'not important';
            const result = await repo.verifyPrintToken(token);

            assert.equal(result, decoded.object);
            sandbox.verify();
        });
    });

});
