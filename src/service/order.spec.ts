// tslint:disable:no-implicit-dependencies

/**
 * 在庫状況サービスステスト
 * @ignore
 */

import { } from 'mocha';
import * as moment from 'moment';
import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
import * as ttts from '../index';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('OrderService', () => {
    describe('createFromTransaction()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('正しいパラメーターで機能を実施するはず', async () => {
            // INパラメーター
            const input = 'transactionId';
            const returnedFunc = ttts.service.order.createFromTransaction(input);

            // mocking transaction repository
            const fakeResult1 = { result: { order: 'test' } };
            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transRepo)
                .expects('findPlaceOrderById')
                .withArgs(input)
                .once()
                .resolves(fakeResult1);

            // mocking注文レポジトリー
            const orderRepo = new ttts.repository.Order(ttts.mongoose.connection);
            sandbox.mock(orderRepo)
                .expects('save')
                .withArgs(fakeResult1.result.order)
                .once()
                .resolves();

            const result = await returnedFunc(orderRepo, transRepo);
            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    describe('processReturn()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('トランザクションレポジトリからnullをもらえばエラーになるはず', async () => {
            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().resolves(null);

            const returnedFunc = ttts.service.order.processReturn('returnOrderTransactionId');
            const result = await returnedFunc(
                <any>undefined,
                <any>undefined,
                <any>undefined,
                transRepo,
                <any>undefined,
                <any>undefined,
                <any>undefined
            ).catch((e: any) => e);

            assert(result instanceof ttts.factory.errors.NotFound);
            sandbox.verify();
        });

        /*it('トランザクションレポジトリからnullをもらえない場合機能を正しく呼ぶはず', async () => {
            // const mock = sandbox.mock(ttts.service.order);
            sandbox.stub(ttts.service.order, 'returnCreditCardSales').callsFake(() => 1);
            sandbox.stub(ttts.service.order, 'notifyReturnOrder').callsFake(() => 1);
            sandbox.stub(ttts.service.order, 'cancelReservations').callsFake(() => 1);
            // mock.expects('returnCreditCardSales').once().returns(sandbox.stub().resolves());
            // mock.expects('notifyReturnOrder').once().returns(sandbox.stub().resolves());
            // mock.expects('cancelReservations').once().returns(sandbox.stub().resolves());

            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const fakeResult = { toObject: sandbox.stub().returns({ object: { transaction: { result: { order: {orderNumber: 111 }}} } }) };
            sandbox.mock(transRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().resolves(fakeResult);

            const orderRepo = new ttts.repository.Order(ttts.mongoose.connection);
            sandbox.mock(orderRepo.orderModel).expects('findOneAndUpdate')
                .withArgs({ orderNumber: 111 }, { orderStatus: ttts.factory.orderStatus.OrderReturned })
                .once().chain('exec').resolves();

            const returnedFunc = ttts.service.order.processReturn('returnOrderTransactionId');
            const result = await returnedFunc(
                <any>'performanceRepo',
                <any>'reservationRepo',
                <any>'stockRepo',
                transRepo,
                <any>'ticketTypeCategoryRateLimitRepo',
                <any>'taskRepo',
                orderRepo
            );

            assert.equal(result, undefined);
            sandbox.verify();
        });*/
    });

    describe('cancelReservations()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('トランザクションレポジトリからnullをもらえばエラーになるはず', async () => {
            // INパラメーター
            const input = 'returnOrderTransactionId';
            const returnedFunc = ttts.service.order.cancelReservations(input);

            // mocking transaction repository
            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().resolves(null);

            const result = await returnedFunc(
                <any>'reservationRepo',
                <any>'stockRepo',
                transRepo,
                <any>'ticketTypeCategoryRateLimitRepo'
            ).catch((e: any) => e);

            assert(result instanceof ttts.factory.errors.NotFound);
            sandbox.verify();
        });

        it('トランザクションレポジトリからnullではない場合エラーにならないはず（rate_limit_unit_in_seconds = 0）', async () => {
            // INパラメーター
            const input = 'returnOrderTransactionId';
            const returnedFunc = ttts.service.order.cancelReservations(input);

            // mocking transaction repository
            const fakeResult = { object: { transaction: { result: { eventReservations: [ {
                status: 'ReservationConfirmed',
                rate_limit_unit_in_seconds: 0,
                performance_start_date: '20180702',
                ticket_ttts_extension: { category: '?' },
                qr_str: '?',
                stocks: [ {
                    id: '?',
                    availability_after: '?',
                    availability_before: '?',
                    holder: '?'
                } ]
            } ] } } } };
            const fakeResult1 = { toObject: sandbox.stub().returns(fakeResult) };
            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().chain('exec').resolves(fakeResult1);

            // mocking券種カテゴリーレート制限リポジトリー
            const ticketTypeCategoryRateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());
            sandbox.mock(ticketTypeCategoryRateLimitRepo).expects('unlock').never();

            // mocking予約リポジトリー
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            sandbox.mock(reservationRepo.reservationModel).expects('findOneAndUpdate')
                .withArgs({ qr_str: '?' }, { status: 'ReservationCancelled' }).once().chain('exec').resolves();

            // mocking在庫リポジトリー
            const expectedArgs2 = {
                _id: '?',
                availability: '?',
                holder: '?'
            };
            const expectedArgs3 = {
                $set: { availability: '?' },
                $unset: { holder: 1 }
            };
            const stockRepo = new ttts.repository.Stock(ttts.mongoose.connection);
            sandbox.mock(stockRepo.stockModel).expects('findOneAndUpdate')
                .withArgs(expectedArgs2, expectedArgs3).once().chain('exec').resolves();

            const result = await returnedFunc(
                reservationRepo,
                stockRepo,
                transRepo,
                ticketTypeCategoryRateLimitRepo
            );

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('トランザクションレポジトリからnullではない場合エラーにならないはず（rate_limit_unit_in_seconds > 0）', async () => {
            // INパラメーター
            const input = 'returnOrderTransactionId';
            const returnedFunc = ttts.service.order.cancelReservations(input);

            // mocking transaction repository
            const fakeResult = { object: { transaction: { result: { eventReservations: [ {
                status: 'ReservationConfirmed',
                rate_limit_unit_in_seconds: 1,
                performance_start_date: '20180702',
                ticket_ttts_extension: { category: '?' },
                qr_str: '?',
                stocks: [ {
                    id: '?',
                    availability_after: '?',
                    availability_before: '?',
                    holder: '?'
                } ]
            } ] } } } };
            const fakeResult1 = { toObject: sandbox.stub().returns(fakeResult) };
            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().chain('exec').resolves(fakeResult1);

            // mocking券種カテゴリーレート制限リポジトリー
            const expectedArgs1 = {
                // tslint:disable-next-line:no-magic-numbers
                performanceStartDate: new Date(2018, 6, 2),
                ticketTypeCategory: '?',
                unitInSeconds: 1
            };
            const ticketTypeCategoryRateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redis.createClient());
            sandbox.mock(ticketTypeCategoryRateLimitRepo).expects('unlock')
                .withArgs(expectedArgs1).once().resolves();

            // mocking予約リポジトリー
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            sandbox.mock(reservationRepo.reservationModel).expects('findOneAndUpdate')
                .withArgs({ qr_str: '?' }, { status: 'ReservationCancelled' }).once().chain('exec').resolves();

            // mocking在庫リポジトリー
            const expectedArgs2 = {
                _id: '?',
                availability: '?',
                holder: '?'
            };
            const expectedArgs3 = {
                $set: { availability: '?' },
                $unset: { holder: 1 }
            };
            const stockRepo = new ttts.repository.Stock(ttts.mongoose.connection);
            sandbox.mock(stockRepo.stockModel).expects('findOneAndUpdate')
                .withArgs(expectedArgs2, expectedArgs3).once().chain('exec').resolves();

            const result = await returnedFunc(
                reservationRepo,
                stockRepo,
                transRepo,
                ticketTypeCategoryRateLimitRepo
            );

            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    describe('returnAllByPerformance()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('パフォーマンスレポジトリから未来end_dateのをもらえばエラーになるはず', async () => {
            // INパラメーター
            const returnedFunc = ttts.service.order.returnAllByPerformance('agentId', 'performanceId');

            // mocking transaction repository
            // tslint:disable-next-line:no-magic-numbers
            const fakeResult1 = { end_date: moment().add(10) };
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo).expects('findById')
                .withArgs('performanceId').once().resolves(fakeResult1);

            const result = await returnedFunc(performanceRepo, <any>'TaskRepo').catch((e: any) => e);

            assert(result instanceof Error);
            sandbox.verify();
        });

        it('パフォーマンスレポジトリから正しいend_dateのをもらえばエラーにならないはず', async () => {
            // INパラメーター
            const returnedFunc = ttts.service.order.returnAllByPerformance('agentId', 'performanceId');

            // mocking transaction repository
            // tslint:disable-next-line:no-magic-numbers
            const fakeResult1 = { end_date: moment().add(-10) };
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo).expects('findById')
                .withArgs('performanceId').once().resolves(fakeResult1);

            // mockingタスクレポジトリー
            // tslint:disable-next-line:no-magic-numbers
            const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
            sandbox.mock(taskRepo).expects('save').once().resolves('ok');

            const result = await returnedFunc(performanceRepo, taskRepo);

            assert.equal(result, 'ok');
            sandbox.verify();
        });
    });

    describe('processReturnAllByPerformance()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('エラーにならないはず', async () => {
            // INパラメーター
            const returnedFunc = ttts.service.order.processReturnAllByPerformance('agentId', 'performanceId');

            // mocking予約レポジトリー
            const fakeResult = [ { transaction: 0, checkins: [] }, { transaction: 1, checkins: [ '2' ] } ];
            const fakeResult1 = [ {
                toObject: sandbox.stub().returns(fakeResult[0])
            }, {
                toObject: sandbox.stub().returns(fakeResult[1])
            } ];
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            sandbox.mock(reservationRepo.reservationModel).expects('find')
                .once().chain('exec').resolves(fakeResult1);

            // mockingパフォーマンスレポジトリー
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo.performanceModel).expects('findByIdAndUpdate').once().chain('exec').resolves();

            // mocking ReturnOrderTransactionService
            const returnOrderTransactionSvc = ttts.service.transaction.returnOrder;
            sandbox.mock(returnOrderTransactionSvc).expects('confirm').once().returns(sandbox.stub().resolves());

            const result = await returnedFunc(performanceRepo, reservationRepo, <any>'transactionRepo');

            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    describe('returnCreditCardSales()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('トランザクションレポジトリーからnullをもらえばエラーになるはず', async () => {
            const returnedFunc = ttts.service.order.returnCreditCardSales('returnOrderTransactionId');

            // mockingトランザクションレポジトリー
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transactionRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().chain('exec').resolves(null);

            const result = await returnedFunc(<any>'performanceRepo', transactionRepo).catch((e) => e);

            assert(result instanceof ttts.factory.errors.NotFound);
            sandbox.verify();
        });

        it('クレジットカードオーソリがなければ何もしないはず', async () => {
            const returnedFunc = ttts.service.order.returnCreditCardSales('returnOrderTransactionId');

            // mockingトランザクションレポジトリー
            const fakeResult1 = { toObject: sandbox.stub().returns({ object: { transaction: { object: { authorizeActions: [ {
                actionStatus: 'CompletedActionStatus',
                purpose: { typeOf: 'NotCreditCard'}
            } ] } } } }) };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transactionRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().chain('exec').resolves(fakeResult1);

            const result = await returnedFunc(<any>'performanceRepo', transactionRepo);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('CompletedActionStatusにも関わらずresultがなければ謎のデータ=>エラーになるはず', async () => {
            const returnedFunc = ttts.service.order.returnCreditCardSales('returnOrderTransactionId');

            // mockingトランザクションレポジトリー
            const fakeResult1 = { toObject: sandbox.stub().returns({ object: { transaction: { object: { authorizeActions: [ {
                actionStatus: 'CompletedActionStatus',
                purpose: { typeOf: 'CreditCard'}
            } ] } } } }) };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transactionRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().chain('exec').resolves(fakeResult1);

            const result = await returnedFunc(<any>'performanceRepo', transactionRepo).catch((e) => e);

            assert(result instanceof ttts.factory.errors.NotFound);
            sandbox.verify();
        });

        it('GMO取引状態に変更があれば金額変更しないはず', async () => {
            const returnedFunc = ttts.service.order.returnCreditCardSales('returnOrderTransactionId');

            // mockingトランザクションレポジトリー
            const fakeResult1 = { toObject: sandbox.stub().returns({ object: { transaction: {
                object: { authorizeActions: [ {
                    actionStatus: 'CompletedActionStatus',
                    purpose: { typeOf: 'CreditCard'},
                    result: {
                        entryTranArgs: 'entryTranArgs',
                        execTranArgs: 'execTranArgs'
                    }
                } ] },
                result: {
                    eventReservations: [ { gmo_order_id: 'gmo_order_id' } ],
                    creditCardSales: {  }
                }
            } } }) };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transactionRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().chain('exec').resolves(fakeResult1);
            sandbox.mock(transactionRepo.transactionModel).expects('findByIdAndUpdate').never();

            const fakeResult2 = { tranId: 'tranId' };
            const creditService = ttts.GMO.services.credit;
            sandbox.mock(creditService).expects('searchTrade').once().resolves(fakeResult2);
            sandbox.mock(creditService).expects('alterTran').never();

            // mockingパフォーマンスレポジトリー
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo.performanceModel).expects('findByIdAndUpdate').never();
            sandbox.mock(performanceRepo.performanceModel).expects('findOneAndUpdate').never();

            const result = await returnedFunc(performanceRepo, transactionRepo);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('GMO取引状態に変更がなければ金額変更するはず（手数料0円の場合）', async () => {
            const returnedFunc = ttts.service.order.returnCreditCardSales('returnOrderTransactionId');

            // mockingトランザクションレポジトリー
            const fakeResult1 = { toObject: sandbox.stub().returns({ object: {
                transaction: {
                    object: { authorizeActions: [ {
                        actionStatus: 'CompletedActionStatus',
                        purpose: { typeOf: 'CreditCard'},
                        result: {
                            entryTranArgs: 'entryTranArgs',
                            execTranArgs: 'execTranArgs'
                        }
                    } ] },
                    result: {
                        eventReservations: [ { gmo_order_id: 'gmo_order_id' } ],
                        creditCardSales: {  }
                    }
                },
                cancellationFee: 0
            } }) };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transactionRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().chain('exec').resolves(fakeResult1);
            sandbox.mock(transactionRepo.transactionModel).expects('findByIdAndUpdate').once().chain('exec').resolves();

            // mocking GMOクレジットサービス
            const creditService = ttts.GMO.services.credit;
            sandbox.mock(creditService).expects('searchTrade').once().resolves({});
            sandbox.mock(creditService).expects('alterTran').once().resolves('alterTranResult');
            sandbox.mock(creditService).expects('changeTran').never();

            // mockingパフォーマンスレポジトリー
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo.performanceModel).expects('findByIdAndUpdate').once().chain('exec').resolves();
            sandbox.mock(performanceRepo.performanceModel).expects('findOneAndUpdate').once().chain('exec').resolves();

            const result = await returnedFunc(performanceRepo, transactionRepo);

            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('GMO取引状態に変更がなければ金額変更するはず（手数料0円ではない場合）', async () => {
            const returnedFunc = ttts.service.order.returnCreditCardSales('returnOrderTransactionId');

            // mockingトランザクションレポジトリー
            const fakeResult1 = { toObject: sandbox.stub().returns({ object: {
                transaction: {
                    object: { authorizeActions: [ {
                        actionStatus: 'CompletedActionStatus',
                        purpose: { typeOf: 'CreditCard'},
                        result: {
                            entryTranArgs: 'entryTranArgs',
                            execTranArgs: 'execTranArgs'
                        }
                    } ] },
                    result: {
                        eventReservations: [ { gmo_order_id: 'gmo_order_id' } ],
                        creditCardSales: {  }
                    }
                },
                cancellationFee: 1
            } }) };
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transactionRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().chain('exec').resolves(fakeResult1);
            sandbox.mock(transactionRepo.transactionModel).expects('findByIdAndUpdate').once().chain('exec').resolves();

            // mocking GMOクレジットサービス
            const creditService = ttts.GMO.services.credit;
            sandbox.mock(creditService).expects('searchTrade').once().resolves({});
            sandbox.mock(creditService).expects('changeTran').once().resolves('changeTranResult');
            sandbox.mock(creditService).expects('alterTran').never();

            // mockingパフォーマンスレポジトリー
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo.performanceModel).expects('findByIdAndUpdate').never();
            sandbox.mock(performanceRepo.performanceModel).expects('findOneAndUpdate').never();

            const result = await returnedFunc(performanceRepo, transactionRepo);

            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    describe('notifyReturnOrder()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('トランザクションレポジトリからnullをもらえばエラーになるはず', async () => {
            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            sandbox.mock(transRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().resolves(null);

            const returnedFunc = ttts.service.order.notifyReturnOrder('returnOrderTransactionId');
            const result = await returnedFunc(transRepo, <any>'taskRepo').catch((e: any) => e);

            assert(result instanceof ttts.factory.errors.NotFound);
            sandbox.verify();
        });

        it('トランザクションレポジトリからnullをもらえなければエラーにならないはず(購入者自身の都合での返品の場合)', async () => {
            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const fakeResult = { toObject: sandbox.stub().returns({ object: { reason: 'Customer' } }) };
            sandbox.mock(transRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().resolves(fakeResult);

            const returnedFunc = ttts.service.order.notifyReturnOrder('returnOrderTransactionId');
            const result = await returnedFunc(transRepo, <any>'taskRepo');

            assert.equal(result, undefined);
            sandbox.verify();
        });

        /*it('トランザクションレポジトリからnullをもらえない場合機能を正しく呼ぶはず', async () => {
            // const mock = sandbox.mock(ttts.service.order);
            sandbox.stub(ttts.service.order, 'returnCreditCardSales').callsFake(() => 1);
            sandbox.stub(ttts.service.order, 'notifyReturnOrder').callsFake(() => 1);
            sandbox.stub(ttts.service.order, 'cancelReservations').callsFake(() => 1);
            // mock.expects('returnCreditCardSales').once().returns(sandbox.stub().resolves());
            // mock.expects('notifyReturnOrder').once().returns(sandbox.stub().resolves());
            // mock.expects('cancelReservations').once().returns(sandbox.stub().resolves());

            const transRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const fakeResult = { toObject: sandbox.stub().returns({ object: { transaction: { result: { order: {orderNumber: 111 }}} } }) };
            sandbox.mock(transRepo.transactionModel).expects('findById')
                .withArgs('returnOrderTransactionId').once().resolves(fakeResult);

            const orderRepo = new ttts.repository.Order(ttts.mongoose.connection);
            sandbox.mock(orderRepo.orderModel).expects('findOneAndUpdate')
                .withArgs({ orderNumber: 111 }, { orderStatus: ttts.factory.orderStatus.OrderReturned })
                .once().chain('exec').resolves();

            const returnedFunc = ttts.service.order.processReturn('returnOrderTransactionId');
            const result = await returnedFunc(
                <any>'performanceRepo',
                <any>'reservationRepo',
                <any>'stockRepo',
                transRepo,
                <any>'ticketTypeCategoryRateLimitRepo',
                <any>'taskRepo',
                orderRepo
            );

            assert.equal(result, undefined);
            sandbox.verify();
        });*/
    });
});
