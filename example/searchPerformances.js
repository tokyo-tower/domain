/**
 * パフォーマンス検索サンプル
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

ttts.service.performance.search({
    startFrom: moment().toDate(),
    startThrough: moment().add(1, 'month').toDate()
})(
    new ttts.repository.Performance(ttts.mongoose.connection),
    new ttts.repository.itemAvailability.Performance(redisClient),
    new ttts.repository.itemAvailability.SeatReservationOffer(redisClient)
    ).then((result) => {
        console.log('performances[0]:', result.performances[0]);
        console.log(result.performances.length, 'performances found.');
        ttts.mongoose.disconnect();
        redisClient.quit();
    });
