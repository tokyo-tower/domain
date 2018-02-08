/**
 * パフォーマンス情報をRedisに保管するサンプル
 * @ignore
 */

const ttts = require('../lib/index');
const moment = require('moment');

ttts.mongoose.connect(process.env.MONGOLAB_URI, { useMongoClient: true });

const redisClient = ttts.redis.createClient(
    parseInt(process.env.TEST_REDIS_PORT, 10),
    process.env.TEST_REDIS_HOST,
    {
        password: process.env.TEST_REDIS_KEY,
        tls: { servername: process.env.TEST_REDIS_HOST }
    });

const checkinGateRepo = new ttts.repository.place.CheckinGate(redisClient);
const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
const performanceAvailabilityRepo = new ttts.repository.itemAvailability.Performance(redisClient);
const seatReservationOfferAvailabilityRepo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);
const performanceWithAggregationRepo = new ttts.repository.PerformanceWithAggregation(redisClient);
const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
const offerRepo = new ttts.repository.offer.ExhibitionEvent(redisClient);

const NS_PER_SEC = 1e9;
const time = process.hrtime();
ttts.service.performance.aggregateCounts({
    startFrom: moment().toDate(),
    startThrough: moment().add(90, 'days').toDate()
}, 3600)(
    checkinGateRepo,
    performanceRepo,
    reservationRepo,
    performanceAvailabilityRepo,
    seatReservationOfferAvailabilityRepo,
    performanceWithAggregationRepo,
    offerRepo
    )
    .then(async () => {
        const diff = process.hrtime(time);
        console.log(`Benchmark took ${diff[0] * NS_PER_SEC + diff[1]} nanoseconds`);

        const performancesOnRedis = await performanceWithAggregationRepo.findAll();
        console.log('performances on redis found.', performancesOnRedis[0]);
        console.log('performances on redis found.', performancesOnRedis.length);

        ttts.mongoose.disconnect();
        redisClient.quit();
    });
