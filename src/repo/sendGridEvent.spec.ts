// tslint:disable:no-implicit-dependencies

/**
 * sendGridEvent repository test
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as sskts from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('constructor()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('インスタンスを生成できるはず', async () => {
        const repository = new sskts.repository.SendGridEvent(sskts.mongoose.connection);

        assert.notEqual(typeof repository.sendGridEventModel, undefined);
        sandbox.verify();
    });
});
