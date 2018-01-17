// tslint:disable:no-implicit-dependencies

/**
 * 座席予約承認アクションレポジトリーテスト
 * @ignore
 */

import { errors } from '@motionpicture/ttts-factory';
import { } from 'mocha';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

import { MongoRepository as SeatReservationAuthorizeActionRepo } from './seatReservation';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('SeatReservationAuthorizeActionRepo.start()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('オブジェクトを取得できるはず', async () => {
        const agent = {};
        const recipient = {};
        const object = {};

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
        const doc = new repo.actionModel();

        sandbox.mock(repo.actionModel).expects('create').once().resolves(doc);

        const result = await repo.start(<any>agent, <any>recipient, <any>object);
        assert(typeof result, 'object');
        sandbox.verify();
    });
});

describe('SeatReservationAuthorizeActionRepo.complete()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、オブジェクトを取得できるはず', async () => {
        const action = { id: 'actionId', result: {} };

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
        const doc = new repo.actionModel();

        sandbox.mock(repo.actionModel).expects('findByIdAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.complete(action.id, <any>action.result);
        assert(typeof result, 'object');
        sandbox.verify();
    });

    it('アクションが存在しなければ、NotFoundエラーになるはず', async () => {
        const action = { id: 'actionId', result: {} };

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
        const doc = null;

        sandbox.mock(repo.actionModel).expects('findByIdAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.complete(action.id, <any>action.result).catch((err) => err);
        assert(result instanceof errors.NotFound);
        sandbox.verify();
    });
});

describe('SeatReservationAuthorizeActionRepo.cancel()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、オブジェクトを取得できるはず', async () => {
        const action = { id: 'actionId' };
        const transactionId = 'transactionId';

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
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

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
        const doc = null;

        sandbox.mock(repo.actionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.cancel(action.id, transactionId).catch((err) => err);
        assert(result instanceof errors.NotFound);
        sandbox.verify();
    });
});

describe('SeatReservationAuthorizeActionRepo.updateObjectAndResultById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、オブジェクトを取得できるはず', async () => {
        const action = { id: 'actionId' };
        const transactionId = 'transactionId';
        const object = {};
        const actionResult = {};

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
        const doc = new repo.actionModel();

        sandbox.mock(repo.actionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.updateObjectAndResultById(<any>action.id, transactionId, <any>object, <any>actionResult);
        assert(typeof result, 'object');
        sandbox.verify();
    });

    it('アクションが存在しなければ、NotFoundエラーになるはず', async () => {
        const action = { id: 'actionId' };
        const transactionId = 'transactionId';
        const object = {};
        const actionResult = {};

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
        const doc = null;

        sandbox.mock(repo.actionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repo.updateObjectAndResultById(<any>action.id, transactionId, <any>object, <any>actionResult)
            .catch((err) => err);
        assert(result instanceof errors.NotFound);
        sandbox.verify();
    });
});

describe('SeatReservationAuthorizeActionRepo.findById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、オブジェクトを取得できるはず', async () => {
        const action = { id: 'actionId' };

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
        const doc = new repo.actionModel();

        sandbox.mock(repo.actionModel).expects('findOne').once()
            .chain('exec').resolves(doc);

        const result = await repo.findById(<any>action.id);
        assert(typeof result, 'object');
        sandbox.verify();
    });

    it('アクションが存在しなければ、NotFoundエラーになるはず', async () => {
        const action = { id: 'actionId' };

        const repo = new SeatReservationAuthorizeActionRepo(mongoose.connection);
        const doc = null;

        sandbox.mock(repo.actionModel).expects('findOne').once()
            .chain('exec').resolves(doc);

        const result = await repo.findById(<any>action.id)
            .catch((err) => err);
        assert(result instanceof errors.NotFound);
        sandbox.verify();
    });
});
