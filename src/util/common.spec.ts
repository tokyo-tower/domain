// tslint:disable:no-implicit-dependencies

/**
 * 共通ユーティリティテスト
 * @ignore
 */

import * as assert from 'power-assert';
import * as request from 'request-promise-native';
import * as sinon from 'sinon';
import * as ttts from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

afterEach(() => {
    sandbox.restore();
});

describe('createToken()', () => {
    it('正常で完了するはず', async () => {
        const util = ttts.CommonUtil.createToken;
        const result = util();
        assert.equal(typeof result, 'string');
    });
});

describe('createHash()', () => {
    it('正常で完了するはず', async () => {
        const util = ttts.CommonUtil.createHash;
        const result1 = util('password', 'salt');
        const result2 = util('password', 'salt');
        assert.equal(result1, result2);
    });
});

describe('toHalfWidth()', () => {
    it('正常で完了するはず', async () => {
        const util = ttts.CommonUtil.toHalfWidth;
        // tslint:disable-next-line:no-irregular-whitespace
        const result = util('～！＝－（）　？');
        assert.equal(result, '~!=-() ?');
    });
});

describe('toFullWidth()', () => {
    it('正常で完了するはず', async () => {
        const util = ttts.CommonUtil.toFullWidth;
        const result = util('~!=-() ?');
        // tslint:disable-next-line:no-irregular-whitespace
        assert.equal(result, '～！＝－（）　？');
    });
});

describe('getPrefectrues()', () => {
    it('正常で完了するはず', async () => {
        const util = ttts.CommonUtil.getPrefectrues;
        const result = util();
        assert.equal(typeof result, 'object');
        // tslint:disable-next-line:no-magic-numbers
        assert.equal(result.length, 47);
    });
});

describe('parseFromKeys()', () => {
    it('正常で完了するはず', async () => {
        const util = ttts.CommonUtil.parseFromKeys;
        const model = { a: 'a', b: 'b', c: 'c', d: 'd' };
        const keys = ['a', 'c'];
        const expected = { a: 'a', c: 'c' };
        const result = util(model, keys);
        assert.deepEqual(result, expected);
    });
});

describe('deleteFromKeys()', () => {
    it('正常で完了するはず', async () => {
        const util = ttts.CommonUtil.deleteFromKeys;
        const model = { a: 'a', b: 'b', c: 'c', d: 'd' };
        const keys = ['b', 'd'];
        const expected = { a: 'a', c: 'c' };
        const result = util(model, keys);
        assert.deepEqual(result, expected);
    });
});

describe('getToken()', () => {
    it('正常で完了するはず', async () => {
        const util = ttts.CommonUtil.getToken;
        const response = 'response';
        sandbox.mock(request).expects('post').once().resolves(response);
        const result = await util(<any>{ scopes: [] });
        assert.deepEqual(result, response);
    });
});
