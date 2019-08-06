// tslint:disable:no-implicit-dependencies

/**
 * 承認アクションレポジトリーテスト
 * @ignore
 */

import { errors } from '@tokyotower/factory';
import { } from 'mocha';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

import { MongoRepository as AuthorizeActionRepo } from './authorize';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('AuthorizeActionRepo.giveUp()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、オブジェクトを取得できるはず', async () => {
        const action = { id: 'actionId' };
        const error = new Error('message');

        const authorizeRepo = new AuthorizeActionRepo(mongoose.connection);
        const doc = new authorizeRepo.actionModel();

        sandbox.mock(authorizeRepo.actionModel)
            .expects('findByIdAndUpdate').once()
            .chain('exec')
            .resolves(doc);

        const result = await authorizeRepo.giveUp(action.id, error);
        assert(typeof result, 'object');
        sandbox.verify();
    });

    it('アクションが存在しなければ、NotFoundエラーになるはず', async () => {
        const action = { id: 'actionId' };
        const error = new Error('message');

        const authorizeRepo = new AuthorizeActionRepo(mongoose.connection);
        const doc = null;

        sandbox.mock(authorizeRepo.actionModel)
            .expects('findByIdAndUpdate').once()
            .chain('exec')
            .resolves(doc);

        const result = await authorizeRepo.giveUp(action.id, error).catch((err) => err);
        assert(result instanceof errors.NotFound);
        sandbox.verify();
    });
});
