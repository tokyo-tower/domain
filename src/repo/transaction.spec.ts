// tslint:disable:no-implicit-dependencies
/**
 * transaction repository test
 */
import { } from 'mocha';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as ttts from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('startPlaceOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、開始できるはず', async () => {
        const transaction = { id: 'id' };

        const repository = new ttts.repository.Transaction(mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('create').once()
            .resolves(new repository.transactionModel());

        const result = await repository.startPlaceOrder(<any>transaction);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('findPlaceOrderById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、オブジェクトが返却されるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new ttts.repository.Transaction(mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findOne').once()
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.findPlaceOrderById(transactionId);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければ、NotFoundエラーとなるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new ttts.repository.Transaction(mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findOne').once()
            .chain('exec')
            .resolves(null);

        const result = await repository.findPlaceOrderById(transactionId).catch((err) => err);
        assert(result instanceof ttts.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('findPlaceOrderInProgressById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、オブジェクトが返却されるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new ttts.repository.Transaction(mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findOne').once()
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.findPlaceOrderInProgressById(transactionId);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければ、NotFoundエラーとなるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new ttts.repository.Transaction(mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findPlaceOrderInProgressById(transactionId).catch((err) => err);
        assert(result instanceof ttts.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('confirmPlaceOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、エラーにならないはず', async () => {
        const transactionId = 'transactionId';
        const endDate = new Date();
        const paymentMethod = ttts.factory.paymentMethodType.CreditCard;
        const authorizeActions: any[] = [];
        const transactionResult = {};

        const repository = new ttts.repository.Transaction(mongoose.connection);
        const doc = new repository.transactionModel();

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repository.confirmPlaceOrder(transactionId, endDate, paymentMethod, authorizeActions, <any>transactionResult);
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければ、NotFoundエラーになるはず', async () => {
        const transactionId = 'transactionId';
        const endDate = new Date();
        const paymentMethod = ttts.factory.paymentMethodType.CreditCard;
        const authorizeActions: any[] = [];
        const transactionResult = {};

        const repository = new ttts.repository.Transaction(mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(null);

        const result = await repository.confirmPlaceOrder(transactionId, endDate, paymentMethod, authorizeActions, <any>transactionResult)
            .catch((err) => err);
        assert(result instanceof ttts.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('searchPlaceOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、配列を取得できるはず', async () => {
        const conditions = {};

        const repo = new ttts.repository.Transaction(mongoose.connection);
        const docs = [new repo.transactionModel()];

        sandbox.mock(repo.transactionModel).expects('find').once()
            .chain('exec').resolves(docs);

        const result = await repo.searchPlaceOrder(<any>conditions);
        assert(Array.isArray(result));
        sandbox.verify();
    });
});
