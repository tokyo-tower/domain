// tslint:disable:no-implicit-dependencies

/**
 * organization repository test
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

describe('findCorporationById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('劇場が存在すれば、取得できるはず', async () => {
        const theaterId = 'theaterId';

        const repository = new ttts.repository.Organization(ttts.mongoose.connection);

        sandbox.mock(repository.organizationModel).expects('findOne').once()
            .chain('exec').resolves(new repository.organizationModel());

        const result = await repository.findCorporationById(theaterId);

        assert.notEqual(result, undefined);
        sandbox.verify();
    });

    it('存在しなければ、NotFoundエラーとなるはず', async () => {
        const theaterId = 'theaterId';

        const repository = new ttts.repository.Organization(ttts.mongoose.connection);

        sandbox.mock(repository.organizationModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findCorporationById(theaterId).catch((err) => err);
        assert(result instanceof ttts.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('findCorporationByIdentifier()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、配列が返却されるはず', async () => {
        const branchCode = 'branchCode';

        const repository = new ttts.repository.Organization(ttts.mongoose.connection);

        sandbox.mock(repository.organizationModel).expects('findOne').once()
            .chain('exec').resolves(new repository.organizationModel());

        const result = await repository.findCorporationByIdentifier(branchCode);

        assert.notEqual(result, undefined);
        sandbox.verify();
    });

    it('存在しなければ、NotFoundエラーとなるはず', async () => {
        const branchCode = 'branchCode';

        const repository = new ttts.repository.Organization(ttts.mongoose.connection);

        sandbox.mock(repository.organizationModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findCorporationByIdentifier(branchCode).catch((err) => err);
        assert(result instanceof ttts.factory.errors.NotFound);
        sandbox.verify();
    });
});
