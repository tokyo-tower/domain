// tslint:disable:no-implicit-dependencies

/**
 * task service test
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

describe('executeByName()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('未実行タスクが存在すれば、実行されるはず', async () => {
        const task = {
            id: 'id',
            name: ttts.factory.taskName.CreateOrder,
            data: { datakey: 'dataValue' },
            status: ttts.factory.taskStatus.Running
        };
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
        sandbox.mock(taskRepo).expects('executeOneByName').once().withArgs(task.name).resolves(task);
        sandbox.mock(TaskFunctionsService).expects(task.name).once().withArgs(task.data).returns(async () => Promise.resolve());
        sandbox.mock(taskRepo).expects('pushExecutionResultById').once().withArgs(task.id, ttts.factory.taskStatus.Executed).resolves();

        const result = await ttts.service.task.executeByName(task.name)(taskRepo, ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('未実行タスクが存在しなければ、実行されないはず', async () => {
        const taskName = ttts.factory.taskName.CreateOrder;
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(taskRepo).expects('executeOneByName').once()
            .withArgs(taskName).rejects(new ttts.factory.errors.NotFound('task'));
        sandbox.mock(ttts.service.task).expects('execute').never();

        const result = await ttts.service.task.executeByName(taskName)(taskRepo, ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('retry()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const INTERVAL = 10;
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(taskRepo).expects('retry').once()
            .withArgs(INTERVAL).resolves();

        const result = await ttts.service.task.retry(INTERVAL)(taskRepo);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('abort()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const INTERVAL = 10;
        const task = {
            id: 'id',
            executionResults: [{ error: 'error' }]
        };
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(taskRepo).expects('abortOne').once().withArgs(INTERVAL).resolves(task);
        sandbox.mock(ttts.service.notification).expects('report2developers').once()
            .withArgs(ttts.service.task.ABORT_REPORT_SUBJECT).returns(async () => Promise.resolve());

        const result = await ttts.service.task.abort(INTERVAL)(taskRepo);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('execute()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('存在するタスク名であれば、完了ステータスへ変更されるはず', async () => {
        const task = {
            id: 'id',
            name: ttts.factory.taskName.CreateOrder,
            data: { datakey: 'dataValue' },
            status: ttts.factory.taskStatus.Running
        };
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(TaskFunctionsService).expects(task.name).once().withArgs(task.data).returns(async () => Promise.resolve());
        sandbox.mock(taskRepo).expects('pushExecutionResultById').once().withArgs(task.id, ttts.factory.taskStatus.Executed).resolves();

        const result = await ttts.service.task.execute(<any>task)(taskRepo, ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('存在しないタスク名であれば、ステータスは変更されないはず', async () => {
        const task = {
            id: 'id',
            name: 'invalidTaskName',
            data: { datakey: 'dataValue' },
            status: ttts.factory.taskStatus.Running
        };
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

        sandbox.mock(taskRepo).expects('pushExecutionResultById').once().withArgs(task.id, task.status).resolves();

        const result = await ttts.service.task.execute(<any>task)(taskRepo, ttts.mongoose.connection, redis.createClient());

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
