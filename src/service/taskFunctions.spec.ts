// tslint:disable:no-implicit-dependencies

/**
 * taskFunctions test
 * @ignore
 */

import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
import * as ttts from '../index';

import * as TaskFunctionsService from './taskFunctions';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('TaskFunctionsService.sendEmailNotification()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('通知サービスが正常であれば、エラーにならないはず', async () => {
        const data = {
            emailMessage: { dataKey: 'dataValue' }
        };

        sandbox.mock(ttts.service.notification).expects('sendEmail').once()
            .withArgs(data.emailMessage).returns(async () => Promise.resolve());

        const result = await TaskFunctionsService.sendEmailNotification(<any>data)(ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('TaskFunctionsService.cancelSeatReservation()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('仮予約解除サービスが正常であれば、エラーにならないはず', async () => {
        const data = {
            transactionId: 'transactionId'
        };

        sandbox.mock(ttts.service.stock).expects('cancelSeatReservationAuth').once()
            .withArgs(data.transactionId).returns(async () => Promise.resolve());

        const result = await TaskFunctionsService.cancelSeatReservation(<any>data)(ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('TaskFunctionsService.cancelCreditCard()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('クレジットカードオーソリ解除サービスが正常であれば、エラーにならないはず', async () => {
        const data = {
            transactionId: 'transactionId'
        };

        sandbox.mock(ttts.service.sales).expects('cancelCreditCardAuth').once()
            .withArgs(data.transactionId).returns(async () => Promise.resolve());

        const result = await TaskFunctionsService.cancelCreditCard(<any>data)(ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('TaskFunctionsService.settleSeatReservation()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('本予約サービスが正常であれば、エラーにならないはず', async () => {
        const data = {
            transactionId: 'transactionId'
        };

        sandbox.mock(ttts.service.stock).expects('transferSeatReservation').once()
            .withArgs(data.transactionId).returns(async () => Promise.resolve());

        const result = await TaskFunctionsService.settleSeatReservation(<any>data)(ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('TaskFunctionsService.settleCreditCard()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('クレジットカード実売上サービスが正常であれば、エラーにならないはず', async () => {
        const data = {
            transactionId: 'transactionId'
        };

        sandbox.mock(ttts.service.sales).expects('settleCreditCardAuth').once()
            .withArgs(data.transactionId).returns(async () => Promise.resolve());

        const result = await TaskFunctionsService.settleCreditCard(<any>data)(ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('TaskFunctionsService.createOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('注文作成サービスが正常であれば、エラーにならないはず', async () => {
        const data = {
            transactionId: 'transactionId'
        };

        sandbox.mock(ttts.service.order).expects('createFromTransaction').once()
            .withArgs(data.transactionId).returns(async () => Promise.resolve());

        const result = await TaskFunctionsService.createOrder(<any>data)(ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('TaskFunctionsService.returnOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('注文作成サービスが正常であれば、エラーにならないはず', async () => {
        const data = {
            transactionId: 'transactionId'
        };

        const returnOrder = TaskFunctionsService.returnOrder(<any>data);

        sandbox.mock(ttts.service.order).expects('processReturn').withArgs(data.transactionId).once()
            .returns(sandbox.stub().resolves());

        const result = await returnOrder(ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('TaskFunctionsService.returnOrdersByPerformance()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('注文作成サービスが正常であれば、エラーにならないはず', async () => {
        const data = {
            performanceId: 'performanceId',
            agentId: 'agentId'
        };

        const returnOrder = TaskFunctionsService.returnOrdersByPerformance(<any>data);

        sandbox.mock(ttts.service.order).expects('processReturnAllByPerformance').withArgs(data.agentId, data.performanceId).once()
            .returns(sandbox.stub().resolves());

        const result = await returnOrder(ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
