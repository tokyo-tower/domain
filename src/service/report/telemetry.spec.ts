// tslint:disable:no-implicit-dependencies

/**
 * データ測定サービステスト
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

describe('telemetryService', () => {
    afterEach(() => {
        sandbox.restore();
    });

    describe('searchGlobalFlow()', () => {
        it('正常で完了するはず', async () => {
            const searchCondition = {
                // tslint:disable-next-line:no-magic-numbers
                measuredFrom: new Date(2017, 1, 1),
                // tslint:disable-next-line:no-magic-numbers
                measuredThrough: new Date(2017, 1, 1)
            };
            const result = ttts.service.report.telemetry.searchGlobalFlow(searchCondition);
            assert.equal(typeof result, 'function');
        });
    });

    describe('searchGlobalStock()', () => {
        it('正常で完了するはず', async () => {
            const searchCondition = {
                // tslint:disable-next-line:no-magic-numbers
                measuredFrom: new Date(2017, 1, 1),
                // tslint:disable-next-line:no-magic-numbers
                measuredThrough: new Date(2017, 1, 1)
            };
            const result = ttts.service.report.telemetry.searchGlobalStock(searchCondition);
            assert.equal(typeof result, 'function');
        });
    });

    describe('searchSellerFlow()', () => {
        it('正常で完了するはず', async () => {
            const searchCondition = {
                // tslint:disable-next-line:no-magic-numbers
                measuredFrom: new Date(2017, 1, 1),
                // tslint:disable-next-line:no-magic-numbers
                measuredThrough: new Date(2017, 1, 1)
            };
            const result = ttts.service.report.telemetry.searchSellerFlow(searchCondition);
            assert.equal(typeof result, 'function');
        });
    });

    describe('searchSellerStock()', () => {
        it('正常で完了するはず', async () => {
            const searchCondition = {
                // tslint:disable-next-line:no-magic-numbers
                measuredFrom: new Date(2017, 1, 1),
                // tslint:disable-next-line:no-magic-numbers
                measuredThrough: new Date(2017, 1, 1)
            };
            const result = ttts.service.report.telemetry.searchSellerStock(searchCondition);
            assert.equal(typeof result, 'function');
        });
    });

    describe('search()', () => {
        it('正常で完了するはず', async () => {
            const searchCondition = {
                // tslint:disable-next-line:no-magic-numbers
                measuredFrom: new Date(2017, 1, 1),
                // tslint:disable-next-line:no-magic-numbers
                measuredThrough: new Date(2017, 1, 1)
            };
            const search = ttts.service.report.telemetry.searchGlobalFlow(searchCondition);
            const telemetryRepo = new ttts.repository.Telemetry(ttts.mongoose.connection);
            sandbox.mock(telemetryRepo.telemetryModel).expects('find').once().chain('exec').resolves('result');
            const result = await search(telemetryRepo);
            assert.equal(result, 'result');
        });
    });

    describe('createFlow()', () => {
        it('正常で完了するはず（sellerIdがない場合）', async () => {
            const target = {
                // tslint:disable-next-line:no-magic-numbers
                measuredAt: new Date(2017, 1, 1)
            };
            const service = ttts.service.report.telemetry.createFlow(target);

            const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
            // tslint:disable-next-line:no-magic-numbers
            sandbox.mock(taskRepo.taskModel).expects('count').exactly(10)
                .returns({ exec: sandbox.stub().resolves(1) });
            const fakeExecutedTasks = [{ toObject: () => ({
                // tslint:disable-next-line:no-magic-numbers
                lastTriedAt: new Date(2017, 1, 1),
                // tslint:disable-next-line:no-magic-numbers
                runsAt: new Date(2017, 1, 1),
                numberOfTried: 1
            }) }];
            // tslint:disable-next-line:no-magic-numbers
            sandbox.mock(taskRepo.taskModel).expects('find').exactly(5).returns({exec: sandbox.stub().resolves(fakeExecutedTasks)});

            const telemetryRepo = new ttts.repository.Telemetry(ttts.mongoose.connection);
            sandbox.mock(telemetryRepo.telemetryModel).expects('create').once().chain('exec').resolves();
            const result = await service(taskRepo, telemetryRepo, <any>'transactionRepo', <any>'authorizeActonRepo');
            assert.equal(result, undefined);
        });
    });
});
