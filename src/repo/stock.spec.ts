// tslint:disable:no-implicit-dependencies

/**
 * 在庫リポジトリーテスト
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as ttts from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('StockRepo', () => {

    describe('saveIfNotExists()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('findOneAndUpdateを呼ぶはず', async () => {
            const repo = new ttts.repository.Stock(ttts.mongoose.connection);
            const stock = {
                id: 'id',
                performance: 'performance',
                seat_code: 'seat_code'
            };

            sandbox.mock(repo.stockModel).expects('findOneAndUpdate').withArgs(
                {
                    _id: stock.id,
                    performance: stock.performance,
                    seat_code: stock.seat_code
                },
                {
                    // なければ作成
                    $setOnInsert: stock
                },
                {
                    upsert: true,
                    new: true
                }
            ).once().chain('exec');

            const result = await repo.saveIfNotExists(<any>stock);
            assert.equal(result, undefined);

            sandbox.verify();
        });
    });
});
