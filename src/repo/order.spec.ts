// tslint:disable:no-implicit-dependencies

/**
 * creativeWork repository test
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

describe('save()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、保管できるはず', async () => {
        const order = {};

        const repository = new ttts.repository.Order(ttts.mongoose.connection);

        sandbox.mock(repository.orderModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(new repository.orderModel());

        const result = await repository.save(<any>order);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
