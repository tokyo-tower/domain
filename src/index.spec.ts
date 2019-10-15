// tslint:disable:no-implicit-dependencies
/**
 * index test
 */
import { } from 'mocha';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import * as domain from './index';

describe('domain', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('モジュールとしてインポートできるはず', async () => {
        assert.deepEqual(typeof domain, 'object');
        sandbox.verify();
    });
});
