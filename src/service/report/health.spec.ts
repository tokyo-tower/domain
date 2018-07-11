// tslint:disable:no-implicit-dependencies

/**
 * ヘルスチェックサービステスト
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

describe('healthReportService.checkGMOSales()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('トランザクションが保存しなくてもエラーにならないはず', async () => {
        // tslint:disable-next-line:no-magic-numbers
        const madeFrom = new Date(2017, 1, 1);
        // tslint:disable-next-line:no-magic-numbers
        const madeThrough = new Date(2018, 1, 1);
        const service = ttts.service.report.health.checkGMOSales(madeFrom, madeThrough);

        const gmoNotificationRepo = new ttts.repository.GMONotification(ttts.mongoose.connection);
        const fakeSales = [{ orderId: 'orderId', amount: 1 }];
        sandbox.mock(gmoNotificationRepo).expects('searchSales').once().resolves(fakeSales);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const fakeTransactions = [ {
            object: { authorizeActions: [ {
                object: { orderId: 'otherOrderId' }
            } ] }
        } ];
        sandbox.mock(transactionRepo.transactionModel).expects('find').chain('exec').resolves(fakeTransactions);

        const result = await service(gmoNotificationRepo, transactionRepo);

        const expectedResult = {
            madeFrom: madeFrom,
            madeThrough: madeThrough,
            numberOfSales: fakeSales.length,
            totalAmount: 1,
            totalAmountCurrency: ttts.factory.priceCurrency.JPY,
            unhealthGMOSales: [ {
                orderId: 'orderId',
                amount: 1,
                reason: 'transaction by orderId not found'
            } ]
        };
        assert.deepEqual(result, expectedResult);
    });

    it('アクセスIDが一致しなくてもエラーにならないはず', async () => {
        // tslint:disable-next-line:no-magic-numbers
        const madeFrom = new Date(2017, 1, 1);
        // tslint:disable-next-line:no-magic-numbers
        const madeThrough = new Date(2018, 1, 1);
        const service = ttts.service.report.health.checkGMOSales(madeFrom, madeThrough);

        const gmoNotificationRepo = new ttts.repository.GMONotification(ttts.mongoose.connection);
        const fakeSales = [{ orderId: 'orderId', amount: 1 }];
        sandbox.mock(gmoNotificationRepo).expects('searchSales').once().resolves(fakeSales);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const fakeTransactions = [ {
            object: { authorizeActions: [ {
                object: { orderId: 'orderId' },
                result: { execTranArgs: { accessId: 'accessId' } }
            } ] }
        } ];
        sandbox.mock(transactionRepo.transactionModel).expects('find').chain('exec').resolves(fakeTransactions);

        const result = await service(gmoNotificationRepo, transactionRepo);

        const expectedResult = {
            madeFrom: madeFrom,
            madeThrough: madeThrough,
            numberOfSales: fakeSales.length,
            totalAmount: 1,
            totalAmountCurrency: ttts.factory.priceCurrency.JPY,
            unhealthGMOSales: [ {
                orderId: 'orderId',
                amount: 1,
                reason: 'accessId not matched'
            } ]
        };
        assert.deepEqual(result, expectedResult);
    });

    it('払い方法が一致しなくてもエラーにならないはず', async () => {
        // tslint:disable-next-line:no-magic-numbers
        const madeFrom = new Date(2017, 1, 1);
        // tslint:disable-next-line:no-magic-numbers
        const madeThrough = new Date(2018, 1, 1);
        const service = ttts.service.report.health.checkGMOSales(madeFrom, madeThrough);

        const gmoNotificationRepo = new ttts.repository.GMONotification(ttts.mongoose.connection);
        const fakeSales = [{ orderId: 'orderId', amount: 1, accessId: 'accessId' }];
        sandbox.mock(gmoNotificationRepo).expects('searchSales').once().resolves(fakeSales);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const fakeTransactions = [ {
            object: { authorizeActions: [ {
                object: { orderId: 'orderId', payType: 'payType' },
                result: { execTranArgs: { accessId: 'accessId' } }
            } ] }
        } ];
        sandbox.mock(transactionRepo.transactionModel).expects('find').chain('exec').resolves(fakeTransactions);

        const result = await service(gmoNotificationRepo, transactionRepo);

        const expectedResult = {
            madeFrom: madeFrom,
            madeThrough: madeThrough,
            numberOfSales: fakeSales.length,
            totalAmount: 1,
            totalAmountCurrency: ttts.factory.priceCurrency.JPY,
            unhealthGMOSales: [ {
                orderId: 'orderId',
                amount: 1,
                reason: 'payType not matched'
            } ]
        };
        assert.deepEqual(result, expectedResult);
    });

    it('オーソリの金額と同一ではなくてもエラーにならないはず', async () => {
        // tslint:disable-next-line:no-magic-numbers
        const madeFrom = new Date(2017, 1, 1);
        // tslint:disable-next-line:no-magic-numbers
        const madeThrough = new Date(2018, 1, 1);
        const service = ttts.service.report.health.checkGMOSales(madeFrom, madeThrough);

        const gmoNotificationRepo = new ttts.repository.GMONotification(ttts.mongoose.connection);
        const fakeSales = [{ orderId: 'orderId', amount: 1, accessId: 'accessId', payType: 'payType' }];
        sandbox.mock(gmoNotificationRepo).expects('searchSales').once().resolves(fakeSales);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const fakeTransactions = [ {
            object: { authorizeActions: [ {
                object: { orderId: 'orderId', payType: 'payType' },
                result: { execTranArgs: { accessId: 'accessId' } }
            } ] }
        } ];
        sandbox.mock(transactionRepo.transactionModel).expects('find').chain('exec').resolves(fakeTransactions);

        const result = await service(gmoNotificationRepo, transactionRepo);

        const expectedResult = {
            madeFrom: madeFrom,
            madeThrough: madeThrough,
            numberOfSales: fakeSales.length,
            totalAmount: 1,
            totalAmountCurrency: ttts.factory.priceCurrency.JPY,
            unhealthGMOSales: [ {
                orderId: 'orderId',
                amount: 1,
                reason: 'amount not matched'
            } ]
        };
        assert.deepEqual(result, expectedResult);
    });

    it('問題なしで完了するはず', async () => {
        // tslint:disable-next-line:no-magic-numbers
        const madeFrom = new Date(2017, 1, 1);
        // tslint:disable-next-line:no-magic-numbers
        const madeThrough = new Date(2018, 1, 1);
        const service = ttts.service.report.health.checkGMOSales(madeFrom, madeThrough);

        const gmoNotificationRepo = new ttts.repository.GMONotification(ttts.mongoose.connection);
        const fakeSales = [{ orderId: 'orderId', amount: 1, accessId: 'accessId', payType: 'payType' }];
        sandbox.mock(gmoNotificationRepo).expects('searchSales').once().resolves(fakeSales);
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        const fakeTransactions = [ {
            object: { authorizeActions: [ {
                object: { orderId: 'orderId', payType: 'payType', amount: 1 },
                result: { execTranArgs: { accessId: 'accessId' } }
            } ] }
        } ];
        sandbox.mock(transactionRepo.transactionModel).expects('find').chain('exec').resolves(fakeTransactions);

        const result = await service(gmoNotificationRepo, transactionRepo);

        const expectedResult = {
            madeFrom: madeFrom,
            madeThrough: madeThrough,
            numberOfSales: fakeSales.length,
            totalAmount: 1,
            totalAmountCurrency: ttts.factory.priceCurrency.JPY,
            unhealthGMOSales: []
        };
        assert.deepEqual(result, expectedResult);
    });
});
