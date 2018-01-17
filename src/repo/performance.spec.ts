// tslint:disable:no-implicit-dependencies

/**
 * パフォーマンスリポジトリーテスト
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

describe('IDでパフォーマンス情報取得', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBが正常であればオブジェクトを取得できるはず', async () => {
        const id = 'id';

        const repo = new ttts.repository.Performance(ttts.mongoose.connection);
        const doc = new repo.performanceModel();

        sandbox.mock(repo.performanceModel).expects('findById').once().chain('exec').resolves(doc);

        const result = await repo.findById(id);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    // it('存在しなければ、NotFoundエラーとなるはず', async () => {
    //     const theaterId = 'theaterId';

    //     const repository = new ttts.repository.Organization(ttts.mongoose.connection);

    //     sandbox.mock(repository.organizationModel).expects('findOne').once()
    //         .chain('exec').resolves(null);

    //     const result = await repository.findCorporationById(theaterId).catch((err) => err);
    //     assert(result instanceof ttts.factory.errors.NotFound);
    //     sandbox.verify();
    // });
});
