/**
 * 集計データつきパフォーマンス検索
 * @ignore
 */

const ttts = require('../lib/index');
const moment = require('moment');

const redisClient = ttts.redis.createClient(
    parseInt(process.env.TEST_REDIS_PORT, 10),
    process.env.TEST_REDIS_HOST,
    {
        password: process.env.TEST_REDIS_KEY,
        tls: { servername: process.env.TEST_REDIS_HOST }
    });

const performanceWithAggregationRepo = new ttts.repository.PerformanceWithAggregation(redisClient);
const seatReservationOfferAvailabilityRepo = new ttts.repository.itemAvailability.SeatReservationOffer(redisClient);

performanceWithAggregationRepo.findAll()
    .then(async (result) => {
        result = result.filter((p) => {
            return (moment(p.startDate).unix() >= moment('2018-02-24T16:30:00+0900').unix() &&
                moment(p.startDate).unix() <= moment('2018-02-24T17:45:00+0900').unix())
        });
        console.log(result);
        console.log(result.length);

        await Promise.all(result.map(async (p) => {
            const offerAvailabilities = await seatReservationOfferAvailabilityRepo.findByPerformance(p.id);
            console.log(offerAvailabilities);
        }));

        redisClient.quit();
    });
