// tslint:disable:no-implicit-dependencies

/**
 * 予約リポジトリーテスト
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

describe('ReservationRepo', () => {

    describe('saveEventReservation()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('findByIdAndUpdateを呼ぶはず', async () => {
            const repo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const reservation = { id: 'id' };

            sandbox.mock(repo.reservationModel).expects('findByIdAndUpdate').withArgs(
                reservation.id,
                {
                    $setOnInsert: reservation
                },
                { upsert: true }
            ).once().chain('exec');

            const result = await repo.saveEventReservation(<any>reservation);
            assert.equal(result, undefined);

            sandbox.verify();
        });
    });
});
