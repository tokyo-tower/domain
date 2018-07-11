// tslint:disable:no-implicit-dependencies

/**
 * パフォーマンスサービスステスト
 * @ignore
 */

import { } from 'mocha';
// import * as moment from 'moment';
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

describe('PerformanceService', () => {
    describe('aggregateCheckinCount', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('正しく実施するはず', async () => {
            const fakecheckinGates = [ { identifier: 'where1' } ];
            const fakeReservations = [ {
                checkins: [ { where: 'where1' }, { whrere: 'where2' } ],
                ticket_type: 'ticket_type',
                ticket_ttts_extension: { category: 'category' }
            } ];
            const fakeOffers = [ { id: 'id', ttts_extension: { category: 'category' } } ];

            const expectResult = {
                checkinCount: 2,
                checkinCountsByWhere: [ {
                    where: 'where1',
                    checkinCountsByTicketType: [ {
                        ticketType: 'id',
                        ticketCategory: 'category',
                        count: 0
                    } ]
                } ]
            };
            const result = await ttts.service.performance.aggregateCheckinCount(
                <any>fakecheckinGates,
                <any>fakeReservations,
                <any>fakeOffers
            );

            assert.deepEqual(result, expectResult);
        });
    });

    describe('aggregateCounts()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('エラーが発生すれば処理しているパフォーマンスを保存しないはず', async () => {
            const fakeSearchConditions = {};
            const fakeTtl = 1;
            const returnedFunc = ttts.service.performance.aggregateCounts(<any>fakeSearchConditions, fakeTtl);

            const fakePerformance = [{ toObject: sandbox.stub().returns([{}]) }];
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo.performanceModel).expects('find').once().chain('exec').resolves(fakePerformance);

            const fakeOffersByEvent = {};
            const exhibitionEventOfferRepo = new ttts.repository.offer.ExhibitionEvent(redis.createClient());
            sandbox.mock(exhibitionEventOfferRepo).expects('findAll').once().resolves(fakeOffersByEvent);

            const fakeReservations =  [{ toObject: sandbox.stub().returns({}) }];
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            sandbox.mock(reservationRepo.reservationModel).expects('find').once().chain('exec').resolves(fakeReservations);

            const fakeCheckinGates = {};
            const checkinGateRepo = new ttts.repository.place.CheckinGate(redis.createClient());
            sandbox.mock(checkinGateRepo).expects('findAll').once().resolves(fakeCheckinGates);

            const fakePerformanceAvailabilities = {};
            const performanceAvailabilityRepo = new ttts.repository.itemAvailability.Performance(redis.createClient());
            sandbox.mock(performanceAvailabilityRepo).expects('findAll').once().resolves(fakePerformanceAvailabilities);

            const seatReservationRepo = new ttts.repository.itemAvailability.SeatReservationOffer(redis.createClient());
            sandbox.mock(seatReservationRepo).expects('findByPerformance').once().rejects('');

            const performanceWithAggregationRepo = new ttts.repository.PerformanceWithAggregation(redis.createClient());
            sandbox.mock(performanceWithAggregationRepo).expects('store').once().resolves();

            const results = await returnedFunc(
                checkinGateRepo,
                performanceRepo,
                reservationRepo,
                performanceAvailabilityRepo,
                seatReservationRepo,
                performanceWithAggregationRepo,
                exhibitionEventOfferRepo
            );

            assert.equal(results, undefined);
            sandbox.verify();
        });

        it('処理が正常完了するはず', async () => {
            const fakeSearchConditions = { startFrom: '', startThrough: '' };
            const fakeTtl = 1;
            const returnedFunc = ttts.service.performance.aggregateCounts(<any>fakeSearchConditions, fakeTtl);

            const fakePerformance = [{ toObject: sandbox.stub().returns({
                id: 'performanceId',
                screen: { sections: [ { seats: [] } ] },
                ttts_extension: {}
            }) }];
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo.performanceModel).expects('find').once().chain('exec').resolves(fakePerformance);

            const fakeOffersByEvent = { performanceId: [ {
                ttts_extension: { category: 'Wheelchair', required_seat_num: 1 },
                id: 'offerId1'
            }, {
                ttts_extension: { category: 'Wheelchair', required_seat_num: 0 },
                id: 'offerId2'
            } ] };
            const exhibitionEventOfferRepo = new ttts.repository.offer.ExhibitionEvent(redis.createClient());
            sandbox.mock(exhibitionEventOfferRepo).expects('findAll').once().resolves(fakeOffersByEvent);

            const fakeReservations =  [{ toObject: sandbox.stub().returns({  }) }];
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            sandbox.mock(reservationRepo.reservationModel).expects('find').once().chain('exec').resolves(fakeReservations);

            const fakeCheckinGates = [{}];
            const checkinGateRepo = new ttts.repository.place.CheckinGate(redis.createClient());
            sandbox.mock(checkinGateRepo).expects('findAll').once().resolves(fakeCheckinGates);

            const fakePerformanceAvailabilities = { performanceId: '1' };
            const performanceAvailabilityRepo = new ttts.repository.itemAvailability.Performance(redis.createClient());
            sandbox.mock(performanceAvailabilityRepo).expects('findAll').once().resolves(fakePerformanceAvailabilities);

            const fakeOfferAvailabilities = { offerId1: 1 };
            const seatReservationRepo = new ttts.repository.itemAvailability.SeatReservationOffer(redis.createClient());
            sandbox.mock(seatReservationRepo).expects('findByPerformance').once().resolves(fakeOfferAvailabilities);

            const performanceWithAggregationRepo = new ttts.repository.PerformanceWithAggregation(redis.createClient());
            sandbox.mock(performanceWithAggregationRepo).expects('store').once().resolves();

            const results = await returnedFunc(
                checkinGateRepo,
                performanceRepo,
                reservationRepo,
                performanceAvailabilityRepo,
                seatReservationRepo,
                performanceWithAggregationRepo,
                exhibitionEventOfferRepo
            );

            assert.equal(results, undefined);
            sandbox.verify();
        });
    });

    describe('search()', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('正常完了するはず', async () => {
            const searchConditions = {};
            const returnedFunc = ttts.service.performance.search(searchConditions);

            const fakePerformanceIds = {};
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo.performanceModel).expects('distinct').once().chain('exec').resolves(fakePerformanceIds);
            sandbox.mock(performanceRepo.performanceModel).expects('count').once().chain('exec').resolves(0);
            const fakePerformance = [{ toObject: sandbox.stub().returns({
                ttts_extension: {}
            }) }];
            sandbox.mock(performanceRepo.performanceModel).expects('find').once().chain('exec').resolves(fakePerformance);

            const fakePerformanceAvailabilities = {};
            const performanceAvailabilityRepo = new ttts.repository.itemAvailability.Performance(redis.createClient());
            sandbox.mock(performanceAvailabilityRepo).expects('findAll').once().resolves(fakePerformanceAvailabilities);

            const fakeOfferAvailabilities = { id1: 1 };
            const seatReservationOfferAvailabilityRepo =
                new ttts.repository.itemAvailability.SeatReservationOffer(redis.createClient());
            sandbox.mock(seatReservationOfferAvailabilityRepo)
                .expects('findByPerformance').once().resolves(fakeOfferAvailabilities);

            const fakeTicketTypes = [{
                ttts_extension: { category: 'Wheelchair' },
                id: 'id1'
            }, {
                ttts_extension: { category: 'Wheelchair' },
                id: 'id2'
            }];
            const exhibitionEventOfferRepo = new ttts.repository.offer.ExhibitionEvent(redis.createClient());
            sandbox.mock(exhibitionEventOfferRepo).expects('findByEventId').once().resolves(fakeTicketTypes);

            const result = returnedFunc(
                performanceRepo,
                performanceAvailabilityRepo,
                seatReservationOfferAvailabilityRepo,
                exhibitionEventOfferRepo
            );

            assert.equal(typeof result, 'object');
        });

        it('正常完了するはず（検索条件がある場合）', async () => {
            const searchConditions = {
                day: 'day',
                theater: 'theater',
                screen: 'screen',
                performanceId: 'performanceId',
                // tslint:disable-next-line:no-magic-numbers
                startFrom: new Date(2010, 1, 1),
                // tslint:disable-next-line:no-magic-numbers
                startThrough: new Date(2020, 1, 1),
                section: 'section',
                words: 'words',
                page: 0,
                limit: 0
            };
            const returnedFunc = ttts.service.performance.search(searchConditions);

            const fakePerformanceIds = {};
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
            sandbox.mock(performanceRepo.performanceModel).expects('distinct').once().chain('exec').resolves(fakePerformanceIds);
            sandbox.mock(performanceRepo.performanceModel).expects('count').once().chain('exec').resolves(0);
            const fakePerformance = [{ toObject: sandbox.stub().returns({
                ttts_extension: {}
            }) }];
            sandbox.mock(performanceRepo.performanceModel).expects('find').once().chain('exec').resolves(fakePerformance);

            const fakePerformanceAvailabilities = {};
            const performanceAvailabilityRepo = new ttts.repository.itemAvailability.Performance(redis.createClient());
            sandbox.mock(performanceAvailabilityRepo).expects('findAll').once().resolves(fakePerformanceAvailabilities);

            const fakeOfferAvailabilities = { id1: 1 };
            const seatReservationOfferAvailabilityRepo =
                new ttts.repository.itemAvailability.SeatReservationOffer(redis.createClient());
            sandbox.mock(seatReservationOfferAvailabilityRepo)
                .expects('findByPerformance').once().resolves(fakeOfferAvailabilities);

            const fakeTicketTypes = [{
                ttts_extension: { category: 'Wheelchair' },
                id: 'id1'
            }, {
                ttts_extension: { category: 'Wheelchair' },
                id: 'id2'
            }];
            const exhibitionEventOfferRepo = new ttts.repository.offer.ExhibitionEvent(redis.createClient());
            sandbox.mock(exhibitionEventOfferRepo).expects('findByEventId').once().resolves(fakeTicketTypes);

            const filmModel = ttts.Models.Film;
            sandbox.mock(filmModel).expects('distinct').once().chain('exec').resolves([]);

            const result = returnedFunc(
                performanceRepo,
                performanceAvailabilityRepo,
                seatReservationOfferAvailabilityRepo,
                exhibitionEventOfferRepo
            );

            assert.equal(typeof result, 'object');
        });
    });
});
