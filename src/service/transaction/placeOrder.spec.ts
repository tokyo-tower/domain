// tslint:disable:no-implicit-dependencies

/**
 * placeOrder transaction service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as ttts from '../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('exportTasks()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('非対応ステータスであれば、Argumentエラーになるはず', async () => {
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        const status = ttts.factory.transactionStatusType.InProgress;
        const transactionDoc = new transactionRepo.transactionModel();
        transactionDoc.set('status', status);

        sandbox.mock(transactionRepo.transactionModel).expects('findOneAndUpdate').never();
        sandbox.mock(transactionRepo).expects('findPlaceOrderById').never();
        sandbox.mock(taskRepo).expects('save').never();
        sandbox.mock(transactionRepo).expects('setTasksExportedById').never();

        const result = await ttts.service.transaction.placeOrder.exportTasks(
            status
        )(taskRepo, transactionRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.Argument);
        sandbox.verify();
    });

    it('タスクエクスポート待ちの取引があれば、エクスポートされるはず', async () => {
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        const status = ttts.factory.transactionStatusType.Confirmed;
        const task = {};
        const transactionDoc = new transactionRepo.transactionModel();
        transactionDoc.set('status', status);

        sandbox.mock(transactionRepo.transactionModel).expects('findOneAndUpdate').once()
            .withArgs(
                {
                    status: status,
                    tasksExportationStatus: ttts.factory.transactionTasksExportationStatus.Unexported,
                    typeOf: ttts.factory.transactionType.PlaceOrder
                },
                { tasksExportationStatus: ttts.factory.transactionTasksExportationStatus.Exporting },
                { new: true }
            ).chain('exec').resolves(transactionDoc);
        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transactionDoc);
        sandbox.mock(taskRepo).expects('save').atLeast(1).resolves(task);
        sandbox.mock(transactionRepo).expects('setTasksExportedById').once().withArgs(transactionDoc.id).resolves();

        const result = await ttts.service.transaction.placeOrder.exportTasks(
            status
        )(taskRepo, transactionRepo);

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('タスクエクスポート待ちの取引がなければ、何もしないはず', async () => {
        const status = ttts.factory.transactionStatusType.Confirmed;
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(transactionRepo.transactionModel).expects('findOneAndUpdate').once()
            .withArgs(
                {
                    status: status,
                    tasksExportationStatus: ttts.factory.transactionTasksExportationStatus.Unexported,
                    typeOf: ttts.factory.transactionType.PlaceOrder
                },
                { tasksExportationStatus: ttts.factory.transactionTasksExportationStatus.Exporting },
                { new: true }
            ).chain('exec').resolves(null);
        sandbox.mock(ttts.service.transaction.placeOrder).expects('exportTasksById').never();
        sandbox.mock(transactionRepo).expects('setTasksExportedById').never();

        const result = await ttts.service.transaction.placeOrder.exportTasks(
            status
        )(taskRepo, transactionRepo);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('exportTasksById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('確定取引であれば5つのタスクがエクスポートされるはず', async () => {
        const numberOfTasks = 3;
        const transaction = {
            id: 'transactionId',
            status: ttts.factory.transactionStatusType.Confirmed
        };
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(taskRepo).expects('save').exactly(numberOfTasks).resolves();

        const result = await ttts.service.transaction.placeOrder.exportTasksById(
            transaction.id
        )(taskRepo, transactionRepo);

        assert(Array.isArray(result));
        assert.equal(result.length, numberOfTasks);
        sandbox.verify();
    });

    it('期限切れ取引であれば3つのタスクがエクスポートされるはず', async () => {
        const numberOfTasks = 2;
        const transaction = {
            id: 'transactionId',
            status: ttts.factory.transactionStatusType.Expired
        };
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(taskRepo).expects('save').exactly(numberOfTasks).resolves();

        const result = await ttts.service.transaction.placeOrder.exportTasksById(
            transaction.id
        )(taskRepo, transactionRepo);

        assert(Array.isArray(result));
        assert.equal(result.length, numberOfTasks);
        sandbox.verify();
    });

    it('非対応ステータスの取引であれば、NotImplementedエラーになるはず', async () => {
        const transaction = {
            id: 'transactionId',
            status: ttts.factory.transactionStatusType.InProgress
        };
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(taskRepo).expects('save').never();

        const result = await ttts.service.transaction.placeOrder.exportTasksById(
            transaction.id
        )(taskRepo, transactionRepo).catch((err) => err);
        assert(result instanceof ttts.factory.errors.NotImplemented);
        sandbox.verify();
    });
});

describe('sendEmail', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('DBが正常であれば、タスクが登録されるはず', async () => {
        const transaction = {
            id: 'id',
            status: ttts.factory.transactionStatusType.Confirmed,
            seller: {},
            agent: {}
        };
        const emailMessageAttributes = {
            sender: { name: 'name', email: 'test@example.com' },
            toRecipient: { name: 'name', email: 'test@example.com' },
            about: 'about',
            text: 'text'
        };
        const task = {};

        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(taskRepo).expects('save').once().resolves(task);

        const result = await ttts.service.transaction.placeOrder.sendEmail(
            transaction.id,
            <any>emailMessageAttributes
        )(taskRepo, transactionRepo);

        assert(typeof result === 'object');
        sandbox.verify();
    });

    it('取引ステータスが確定済でなければ、Forbiddenエラーになるはず', async () => {
        const transaction = {
            id: 'id',
            status: ttts.factory.transactionStatusType.InProgress,
            seller: {},
            agent: {}
        };
        const emailMessageAttributes = {
            sender: { name: 'name', email: 'test@example.com' },
            toRecipient: { name: 'name', email: 'test@example.com' },
            about: 'about',
            text: 'text'
        };

        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(taskRepo).expects('save').never();

        const result = await ttts.service.transaction.placeOrder.sendEmail(
            transaction.id,
            <any>emailMessageAttributes
        )(taskRepo, transactionRepo).catch((err) => err);

        assert(result instanceof ttts.factory.errors.Forbidden);
        sandbox.verify();
    });
});

describe('download()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('正しくないフォーマットで実行すればエラーになるはず', async () => {
        const service = ttts.service.transaction.placeOrder.download(<any>'condition', <any>'csvx');
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        sandbox.mock(transactionRepo).expects('searchPlaceOrder').once().withArgs('condition').resolves([]);
        const result = await service(transactionRepo).catch((e) => e);
        assert(result instanceof ttts.factory.errors.NotImplemented);
        sandbox.verify();
    });

    it('正しいフォーマットで実行すればエラーにならないはず', async () => {
        const service = ttts.service.transaction.placeOrder.download(<any>'condition', 'csv');
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        sandbox.mock(transactionRepo).expects('searchPlaceOrder').once().withArgs('condition').resolves([]);
        const result = await service(transactionRepo).catch((e) => e);
        assert.equal(typeof result, 'string');
        sandbox.verify();
    });
});

describe('transaction2report()', () => {
    it('正常で完了するはず（トランザクションのresultがある場合）', async () => {
        const transaction: any = {
            result: {
                order: {
                    confirmationNumber: 1,
                    paymentMethods: [{}],
                    discounts: [{}]
                },
                eventReservations: [ {
                    status: ttts.factory.reservationStatusType.ReservationConfirmed,
                    ticket_type_name: {},
                    film_name: {},
                    // tslint:disable-next-line:no-magic-numbers
                    performance_start_date: new Date(2017, 1, 1),
                    // tslint:disable-next-line:no-magic-numbers
                    performance_end_date: new Date(2017, 1, 1),
                    theater_name: {},
                    screen_name: {}
                } ]
            }
        };
        let result = ttts.service.transaction.placeOrder.transaction2report(<any>transaction);
        assert(typeof result, 'object');
        // tslint:disable-next-line:no-magic-numbers
        transaction.startDate = new Date(2017, 1, 1);
        // tslint:disable-next-line:no-magic-numbers
        transaction.endDate = new Date(2017, 1, 1);
        result = ttts.service.transaction.placeOrder.transaction2report(<any>transaction);
        assert(typeof result, 'object');
    });

    it('正常で完了するはず（トランザクションのresultがない場合）', async () => {
        const transaction: any = {
            object: {}
        };
        let result = ttts.service.transaction.placeOrder.transaction2report(<any>transaction);
        assert(typeof result, 'object');
        // tslint:disable-next-line:no-magic-numbers
        transaction.startDate = new Date(2017, 1, 1);
        // tslint:disable-next-line:no-magic-numbers
        transaction.endDate = new Date(2017, 1, 1);
        transaction.object.customerContact = {  };
        result = ttts.service.transaction.placeOrder.transaction2report(<any>transaction);
        assert(typeof result, 'object');
    });
});
