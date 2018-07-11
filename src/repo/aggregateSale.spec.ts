// tslint:disable:no-implicit-dependencies

/**
 * aggregateSale repository test
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as ttts from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('constructor()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('インスタンス生成できるはず', async () => {
        const repo = new ttts.repository.AggregateSale(ttts.mongoose.connection);

        assert.notEqual(repo.aggregateSaleModel, undefined);
    });
});
