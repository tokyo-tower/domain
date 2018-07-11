// tslint:disable:no-implicit-dependencies

/**
 * 売上集計サービステスト
 * @ignore
 */
import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as ttts from '../../index';

// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('report4salesService', () => {
    describe('aggregateSalesByEndDate', () => {
        it('正常に実行するはず', async () => {
            const service = ttts.service.aggregate.report4sales.aggregateSalesByEndDate('20170702');

            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const fakePlaceOrderTransactions = [ { toObject: sandbox.stub().returns({
                object: {
                    transaction: {
                        result: {
                            order: {
                                orderNumber: 'orderNumber',
                                price: 0
                            }
                        }
                    },
                    cancellationFee: 0
                },
                result: {
                    order: {
                        orderNumber: 'orderNumber',
                        price: 0
                    }
                }
            }) } ];
            sandbox.mock(transactionRepo.transactionModel).expects('find').twice()
                .returns({ exec: sandbox.stub().resolves(fakePlaceOrderTransactions)});

            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const fakeReservation = [ { toObject: sandbox.stub().returns({
                order_number: 'orderNumber',
                payment_seat_index: 0,
                theater_name: {},
                screen_name: {},
                film_name: {},
                seat_grade_name: {},
                seat_grade_additional_charge: 1,
                ticket_type_name: {},
                ticket_ttts_extension: { csv_code: '0000000000231' },
                charge: 0,
                purchaser_group: 'Customer',
                purchased_at: '20170207',
                payment_method: 'CreditCard',
                checkins: []
            }) },
            { toObject: sandbox.stub().returns({
                order_number: 'orderNumber',
                purchaser_address: 'purchaser_address',
                purchaser_age: 'purchaser_age',
                purchaser_gender: 'purchaser_gender',
                payment_seat_index: 1,
                theater_name: {},
                screen_name: {},
                film_name: {},
                seat_grade_name: {},
                seat_grade_additional_charge: 1,
                ticket_type_name: {},
                ticket_ttts_extension: {},
                charge: 0,
                purchaser_group: '00',
                owner_username: 'abc',
                purchased_at: '20170207',
                payment_method: '2',
                checkins: [ { when: '20170207' } ]
            }) } ];
            sandbox.mock(reservationRepo.reservationModel).expects('find').twice()
                .returns({ exec: sandbox.stub().resolves(fakeReservation)});

            const aggregateSalesRepo = new ttts.repository.AggregateSale(ttts.mongoose.connection);
            sandbox.mock(aggregateSalesRepo.aggregateSaleModel).expects('create').once().resolves();

            const result = await service(reservationRepo, transactionRepo, aggregateSalesRepo);
            assert.equal(result, undefined);
            sandbox.verify();
        });

        it('売上集計リポジトリーからエラーが発生してもエラーにならないはず', async () => {
            const service = ttts.service.aggregate.report4sales.aggregateSalesByEndDate(<any>null);

            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const fakePlaceOrderTransactions = [ { toObject: sandbox.stub().returns({
                object: {
                    transaction: {
                        result: {
                            order: {
                                orderNumber: 'orderNumber',
                                price: 0
                            }
                        }
                    },
                    cancellationFee: 0
                },
                result: {
                    order: {
                        orderNumber: 'orderNumber',
                        price: 0
                    }
                }
            }) } ];
            sandbox.mock(transactionRepo.transactionModel).expects('find').twice()
                .returns({ exec: sandbox.stub().resolves(fakePlaceOrderTransactions)});

            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const fakeReservation = [ { toObject: sandbox.stub().returns({
                order_number: 'orderNumber',
                payment_seat_index: 0,
                theater_name: {},
                screen_name: {},
                film_name: {},
                seat_grade_name: {},
                seat_grade_additional_charge: 1,
                ticket_type_name: {},
                ticket_ttts_extension: { csv_code: '0000000000231' },
                charge: 0,
                purchaser_group: 'Customer',
                purchased_at: '20170207',
                payment_method: 'CreditCard',
                checkins: []
            }) },
            { toObject: sandbox.stub().returns({
                order_number: 'orderNumber',
                purchaser_address: 'purchaser_address',
                purchaser_age: 'purchaser_age',
                purchaser_gender: 'purchaser_gender',
                payment_seat_index: 1,
                theater_name: {},
                screen_name: {},
                film_name: {},
                seat_grade_name: {},
                seat_grade_additional_charge: 1,
                ticket_type_name: {},
                ticket_ttts_extension: {},
                charge: 0,
                purchaser_group: '00',
                owner_username: 'abc',
                purchased_at: '20170207',
                payment_method: '2',
                checkins: [ { when: '20170207' } ]
            }) } ];
            sandbox.mock(reservationRepo.reservationModel).expects('find').twice()
                .returns({ exec: sandbox.stub().resolves(fakeReservation)});

            const aggregateSalesRepo = new ttts.repository.AggregateSale(ttts.mongoose.connection);
            sandbox.mock(aggregateSalesRepo.aggregateSaleModel).expects('create').once().rejects();

            const result = await service(reservationRepo, transactionRepo, aggregateSalesRepo);
            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    describe('aggregateSalesByEventStartDate', () => {
        it('正常に実行するはず', async () => {
            const service = ttts.service.aggregate.report4sales.aggregateSalesByEventStartDate('20170702');

            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const fakePlaceOrderTransactions = [ { toObject: sandbox.stub().returns({
                object: {
                    transaction: {
                        result: {
                            order: {
                                orderNumber: 'orderNumber',
                                price: 0
                            }
                        }
                    },
                    cancellationFee: 0
                },
                result: {
                    order: {
                        orderNumber: 'orderNumber',
                        price: 0
                    }
                }
            }) } ];
            sandbox.mock(transactionRepo.transactionModel).expects('find').twice()
                .returns({ exec: sandbox.stub().resolves(fakePlaceOrderTransactions)});

            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const fakeReservation = [ { toObject: sandbox.stub().returns({
                order_number: 'orderNumber',
                payment_seat_index: 0,
                theater_name: {},
                screen_name: {},
                film_name: {},
                seat_grade_name: {},
                seat_grade_additional_charge: 1,
                ticket_type_name: {},
                ticket_ttts_extension: { csv_code: '0000000000231' },
                charge: 0,
                purchaser_group: 'Customer',
                purchased_at: '20170207',
                payment_method: 'CreditCard',
                checkins: []
            }) },
            { toObject: sandbox.stub().returns({
                order_number: 'orderNumber',
                purchaser_address: 'purchaser_address',
                purchaser_age: 'purchaser_age',
                purchaser_gender: 'purchaser_gender',
                payment_seat_index: 1,
                theater_name: {},
                screen_name: {},
                film_name: {},
                seat_grade_name: {},
                seat_grade_additional_charge: 1,
                ticket_type_name: {},
                ticket_ttts_extension: {},
                charge: 0,
                purchaser_group: '00',
                owner_username: 'abc',
                purchased_at: '20170207',
                payment_method: '2',
                checkins: [ { when: '20170207' } ]
            }) } ];
            sandbox.mock(reservationRepo.reservationModel).expects('find').twice()
                .returns({ exec: sandbox.stub().resolves(fakeReservation)});

            const aggregateSalesRepo = new ttts.repository.AggregateSale(ttts.mongoose.connection);
            sandbox.mock(aggregateSalesRepo.aggregateSaleModel).expects('create').once().resolves();

            const result = await service(reservationRepo, transactionRepo, aggregateSalesRepo);
            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    describe('envテスト', () => {
        beforeEach(() => {
            process.env.POS_CLIENT_ID = 'clientId';
            process.env.TOP_DECK_OPEN_DATE = '20100702';
            process.env.RESERVATION_START_DATE = '20100703';
        });

        it('process.envの値を呼んで、使用するはず', async () => {
            const service = ttts.service.aggregate.report4sales.aggregateSalesByEventStartDate('20170702');

            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const fakePlaceOrderTransactions = [ { toObject: sandbox.stub().returns({
                object: {
                    transaction: {
                        result: {
                            order: {
                                orderNumber: 'orderNumber',
                                price: 0
                            }
                        }
                    },
                    cancellationFee: 0
                },
                result: {
                    order: {
                        orderNumber: 'orderNumber',
                        price: 0
                    }
                },
                agent: { id: 'clientId' }
            }) } ];
            sandbox.mock(transactionRepo.transactionModel).expects('find').twice()
                .returns({ exec: sandbox.stub().resolves(fakePlaceOrderTransactions)});

            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const fakeReservation = [ { toObject: sandbox.stub().returns({
                order_number: 'orderNumber',
                payment_seat_index: 0,
                theater_name: {},
                screen_name: {},
                film_name: {},
                seat_grade_name: {},
                seat_grade_additional_charge: 1,
                ticket_type_name: {},
                ticket_ttts_extension: { csv_code: '0000000000231' },
                charge: 0,
                purchaser_group: 'Customer',
                purchased_at: '20170207',
                payment_method: 'CreditCard',
                checkins: []
            }) },
            { toObject: sandbox.stub().returns({
                order_number: 'orderNumber',
                purchaser_address: 'purchaser_address',
                purchaser_age: 'purchaser_age',
                purchaser_gender: 'purchaser_gender',
                payment_seat_index: 1,
                theater_name: {},
                screen_name: {},
                film_name: {},
                seat_grade_name: {},
                seat_grade_additional_charge: 1,
                ticket_type_name: {},
                ticket_ttts_extension: {},
                charge: 0,
                purchaser_group: '00',
                owner_username: 'abc',
                purchased_at: '20170207',
                payment_method: '2',
                checkins: [ { when: '20170207' } ]
            }) } ];
            sandbox.mock(reservationRepo.reservationModel).expects('find').twice()
                .returns({ exec: sandbox.stub().resolves(fakeReservation)});

            const aggregateSalesRepo = new ttts.repository.AggregateSale(ttts.mongoose.connection);
            sandbox.mock(aggregateSalesRepo.aggregateSaleModel).expects('create').once().rejects();

            const result = await service(reservationRepo, transactionRepo, aggregateSalesRepo);
            assert.equal(result, undefined);
            sandbox.verify();
        });
    });
});
