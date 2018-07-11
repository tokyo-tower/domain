// tslint:disable:no-implicit-dependencies

/**
 * 注文返品サービステスト
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as ttts from '../../index';
import * as TaskRepo from '../../repo/task';
import * as TransactionRepo from '../../repo/transaction';

// tslint:disable-next-line:no-var-requires no-require-imports
require('sinon-mongoose');

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

afterEach(() => {
    sandbox.restore();
});

describe('returnOrderService', () => {
    describe('confirm()', () => {
        it('トランザクションレポジトリーからnullをもらえばNotFoundエラーになるはず', async () => {
            const params = {
                transactionId: 'transactionId'
            };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transactionRepo.transactionModel).expects('findOne').chain('exec').resolves(null);
            const service = ttts.service.transaction.returnOrder.confirm(<any>params);
            const result = await service(transactionRepo).catch((err) => err);
            assert(result instanceof ttts.factory.errors.NotFound);
            sandbox.verify();
        });

        it('クレジットカード決済の場合、取引状態が実売上でなければArgumentエラーになるはず', async () => {
            const params = {
                transactionId: 'transactionId'
            };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const transaction = { toObject: () => ({
                result: {},
                object: { paymentMethod: ttts.factory.paymentMethodType.CreditCard }
            })};
            sandbox.mock(transactionRepo.transactionModel).expects('findOne').chain('exec').resolves(transaction);
            const service = ttts.service.transaction.returnOrder.confirm(<any>params);
            const result = await service(transactionRepo).catch((err) => err);
            assert(result instanceof ttts.factory.errors.Argument);
            sandbox.verify();
        });

        it('トランザクション作成でエラーが発生すればAlreadyInUseエラーになるはず（MongoErrorの場合）', async () => {
            const params = {
                transactionId: 'transactionId',
                forcibly: true
            };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const transaction = { toObject: () => ({
                result: {eventReservations: [{}]},
                object: { paymentMethod: ttts.factory.paymentMethodType.Cash }
            })};
            sandbox.mock(transactionRepo.transactionModel).expects('findOne').chain('exec').resolves(transaction);
            const error = {
                name: 'MongoError',
                code: 11000
            };
            sandbox.mock(transactionRepo.transactionModel).expects('create').once().rejects(error);
            const service = ttts.service.transaction.returnOrder.confirm(<any>params);
            const result = await service(transactionRepo).catch((err) => err);
            assert(result instanceof ttts.factory.errors.AlreadyInUse);
            sandbox.verify();
        });

        it('トランザクション作成でエラーが発生すればエラーになるはず（他のErrorの場合）', async () => {
            const params = {
                transactionId: 'transactionId',
                forcibly: true
            };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const transaction = { toObject: () => ({
                result: {eventReservations: [{}]},
                object: { paymentMethod: ttts.factory.paymentMethodType.Cash }
            })};
            sandbox.mock(transactionRepo.transactionModel).expects('findOne').chain('exec').resolves(transaction);
            sandbox.mock(transactionRepo.transactionModel).expects('create').once().rejects('error');
            const service = ttts.service.transaction.returnOrder.confirm(<any>params);
            const result = await service(transactionRepo).catch((err) => err);
            assert.equal(result, 'error');
            sandbox.verify();
        });

        it('入塔予定日の3日前過ぎていたらエラーになるはず', async () => {
            const params = {
                transactionId: 'transactionId',
                forcibly: false
            };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const transaction = { toObject: () => ({
                result: {eventReservations: [{ performance_start_date: new Date() }]},
                object: { paymentMethod: ttts.factory.paymentMethodType.Cash }
            })};
            sandbox.mock(transactionRepo.transactionModel).expects('findOne').chain('exec').resolves(transaction);
            const service = ttts.service.transaction.returnOrder.confirm(<any>params);
            const result = await service(transactionRepo).catch((err) => err);
            assert(result instanceof ttts.factory.errors.Argument);
            sandbox.verify();
        });

        it('正常で完了するはず', async () => {
            const params = {
                transactionId: 'transactionId'
            };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const startDate = new Date();
            // tslint:disable-next-line:no-magic-numbers
            startDate.setDate(startDate.getDate() + 10);
            const transaction = { toObject: () => ({
                result: {eventReservations: [{ performance_start_date: startDate }]},
                object: { paymentMethod: ttts.factory.paymentMethodType.Cash }
            })};
            sandbox.mock(transactionRepo.transactionModel).expects('findOne').chain('exec').resolves(transaction);
            sandbox.mock(transactionRepo.transactionModel).expects('create').once().resolves({ toObject: () => 'success' });
            const service = ttts.service.transaction.returnOrder.confirm(<any>params);
            const result = await service(transactionRepo).catch((err) => err);
            assert.equal(result, 'success');
            sandbox.verify();
        });
    });

    describe('sendMail()', () => {
        it('トランザクションが確認していなかったらエラーになるはず', async () => {
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const transaction = { status: 'wrongStatus' };
            sandbox.mock(transactionRepo).expects('findReturnOrderById').resolves(transaction);
            const service = ttts.service.transaction.returnOrder.sendEmail('transactionId', <any>'emailMessageAttributes');
            const result = await service(<any>'taskRepo', transactionRepo).catch((err) => err);
            assert(result instanceof ttts.factory.errors.Forbidden);
            sandbox.verify();
        });

        it('正常で完了するはず', async () => {
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const transaction = {
                status: ttts.factory.transactionStatusType.Confirmed,
                object: { transaction: { seller: {}, agent: {} } }
            };
            sandbox.mock(transactionRepo).expects('findReturnOrderById').resolves(transaction);
            const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
            sandbox.mock(taskRepo).expects('save').resolves('result');
            const emailMessageAttributes = {
                sender: {
                    name: 'name',
                    email: 'abc@email.com',
                    typeOf: ttts.factory.paymentMethodType.Cash
                },
                toRecipient: {
                    name: 'name',
                    email: 'xyz@email.com',
                    typeOf: ttts.factory.paymentMethodType.Cash
                },
                about: 'about',
                text: 'text'
            };
            const service = ttts.service.transaction.returnOrder.sendEmail('transactionId', <any>emailMessageAttributes);
            const result = await service(taskRepo, transactionRepo);
            assert.equal(result, 'result');
            sandbox.verify();
        });
    });

    describe('exportTasks()', () => {
        it('ステータスが正しくない場合エラーになるはず', async () => {
            const status = ttts.factory.transactionStatusType.Canceled;
            const result = await ttts.service.transaction.returnOrder.exportTasks(status).catch((err) => err);
            assert(result instanceof ttts.factory.errors.Argument);
            sandbox.verify();
        });

        it('トランザクションレポジトリーからnullをもらえば何もしないはず', async () => {
            const replaceTransactionRepo = new TransactionRepo.MongoRepository(ttts.mongoose.connection);
            const transactionRepoStub = sandbox.stub(TransactionRepo, 'MongoRepository');
            sandbox.mock(replaceTransactionRepo.transactionModel).expects('findOneAndUpdate').once()
                .chain('exec').resolves(null);
            transactionRepoStub.returns(replaceTransactionRepo);

            const status = ttts.factory.transactionStatusType.Confirmed;
            const result = await ttts.service.transaction.returnOrder.exportTasks(status).catch((err) => err);
            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('正常で完了するはず', async () => {
            const transaction: any = { id: 'transactionId', status: ttts.factory.transactionStatusType.Confirmed };
            const status = ttts.factory.transactionStatusType.Confirmed;

            const replaceTaskRepo = new TaskRepo.MongoRepository(ttts.mongoose.connection);
            const replaceTransactionRepo = new TransactionRepo.MongoRepository(ttts.mongoose.connection);
            const transactionRepoStub = sandbox.stub(TransactionRepo, 'MongoRepository');
            const taskRepoStub = sandbox.stub(TaskRepo, 'MongoRepository');
            transactionRepoStub.returns(replaceTransactionRepo);
            taskRepoStub.returns(replaceTaskRepo);

            const mock = (condition: { task: boolean; trans: boolean } = { task: true, trans: true }) => {
                sandbox.mock(replaceTransactionRepo.transactionModel).expects('findOneAndUpdate').once()
                .chain('exec').resolves({ toObject: () => transaction });
                sandbox.mock(replaceTransactionRepo).expects('findReturnOrderById').withArgs(transaction.id).once().resolves(transaction);
                if (!condition.task) {
                    sandbox.mock(replaceTaskRepo).expects('save').never();
                } else {
                    sandbox.mock(replaceTaskRepo).expects('save').once().resolves();
                }
                if (!condition.trans) {
                    sandbox.mock(replaceTransactionRepo).expects('setTasksExportedById').never();
                } else {
                    sandbox.mock(replaceTransactionRepo).expects('setTasksExportedById').withArgs(transaction.id).once().resolves();
                }
            };
            const getResult = () => ttts.service.transaction.returnOrder.exportTasks(status).catch((err) => err);

            mock();
            let result = await getResult();
            assert.equal(result, undefined);
            sandbox.verify();

            transaction.status = ttts.factory.transactionStatusType.Expired;
            mock({task: false, trans: true});
            result = await getResult();
            assert.equal(result, undefined);
            sandbox.verify();

            transaction.status = 'otherSatus';
            mock({task: false, trans: false});
            result = await getResult();
            assert(result instanceof ttts.factory.errors.NotImplemented);
            sandbox.verify();
        });
    });
});
