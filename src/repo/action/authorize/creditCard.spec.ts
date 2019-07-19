// tslint:disable:no-implicit-dependencies

/**
 * クレジットカード承認アクションレポジトリーテスト
 * @ignore
 */

import { errors } from '@tokyotower/factory';
import { } from 'mocha';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

import { MongoRepository as CreditCardAuthorizeActionRepo } from './creditCard';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('CreditCardAuthorizeActionRepo.start()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('オブジェクトを取得できるはず', async () => {
        const agent = {};
        const recipient = {};
        const object = {};

        const repo = new CreditCardAuthorizeActionRepo(mongoose.connection);
        const doc = new repo.actionModel();

        sandbox.mock(repo.actionModel).expects('create').once().resolves(doc);

        const result = await repo.start(<any>agent, <any>recipient, <any>object);
        assert(typeof result, 'object');
        sandbox.verify();
    });
});

describe('CreditCardAuthorizeActionRepo.complete()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、オブジェクトを取得できるはず', async () => {
        const action = { id: 'actionId', result: {} };

        const repo = new CreditCardAuthorizeActionRepo(mongoose.connection);
        const doc = new repo.actionModel();

        sandbox.mock(repo.actionModel).expects('findByIdAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.complete(action.id, <any>action.result);
        assert(typeof result, 'object');
        sandbox.verify();
    });

    it('アクションが存在しなければ、NotFoundエラーになるはず', async () => {
        const action = { id: 'actionId', result: {} };

        const repo = new CreditCardAuthorizeActionRepo(mongoose.connection);
        const doc = null;

        sandbox.mock(repo.actionModel).expects('findByIdAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.complete(action.id, <any>action.result).catch((err) => err);
        assert(result instanceof errors.NotFound);
        sandbox.verify();
    });
});

describe('CreditCardAuthorizeActionRepo.cancel()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、オブジェクトを取得できるはず', async () => {
        const action = { id: 'actionId' };
        const transactionId = 'transactionId';

        const repo = new CreditCardAuthorizeActionRepo(mongoose.connection);
        const doc = new repo.actionModel();

        sandbox.mock(repo.actionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.cancel(<any>action.id, transactionId);
        assert(typeof result, 'object');
        sandbox.verify();
    });

    it('アクションが存在しなければ、NotFoundエラーになるはず', async () => {
        const action = { id: 'actionId' };
        const transactionId = 'transactionId';

        const repo = new CreditCardAuthorizeActionRepo(mongoose.connection);
        const doc = null;

        sandbox.mock(repo.actionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.cancel(action.id, transactionId).catch((err) => err);
        assert(result instanceof errors.NotFound);
        sandbox.verify();
    });
});
