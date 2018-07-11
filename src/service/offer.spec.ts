// tslint:disable:no-implicit-dependencies

/**
 * 販売情報サービステスト
 * @ignore
 */

import { } from 'mocha';
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

describe('offerService', () => {
    describe('updateExhibitionEventOffers()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('正しいパラメーターで機能を実施するはず', async () => {
            // INパラメーター
            const input = {
                // tslint:disable-next-line:no-magic-numbers
                startFrom : new Date(2017, 7, 5),
                // tslint:disable-next-line:no-magic-numbers
                startThrough: new Date(2018, 7, 5),
                ttl: 0
            };
            const returnedFunc = ttts.service.offer.updateExhibitionEventOffers(input);

            // mockingパフォーマンスレポジトリー
            const expectedArgs1 = {
                start_date: {
                    $gt: input.startFrom,
                    $lt: input.startThrough
                }
            };
            const fakeResult = {
                id: '0',
                start_date: '20170702',
                ticket_type_group: { ticket_types : [ {
                    id: 4
                } ] }
            };
            const fakeResult1 = [ { toObject: sandbox.stub().returns(fakeResult) } ];
            const performRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performRepo.performanceModel)
                .expects('find')
                .withArgs(expectedArgs1)
                .once()
                .chain('exec')
                .resolves(fakeResult1);

            // mocking展示イベントの販売情報レポジトリー
            const expectedArgs2: { [index: string]: typeof fakeResult.ticket_type_group.ticket_types } = {  };
            [fakeResult].forEach((performance) => {
                expectedArgs2[performance.id] = performance.ticket_type_group.ticket_types;
            });
            const redisClient = redis.createClient();
            const offerRepo = new ttts.repository.offer.ExhibitionEvent(redisClient);
            sandbox.mock(offerRepo).expects('store').withArgs(expectedArgs2, input.ttl).once().resolves();

            const result = await returnedFunc(performRepo, offerRepo);
            assert.equal(result, undefined);
            sandbox.verify();
        });
    });
});
