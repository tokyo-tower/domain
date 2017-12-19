/**
 * パフォーマンスの券種ごとの在庫状況更新サンプル
 * @ignore
 */

const ttts = require('../lib/index');

ttts.mongoose.connect(process.env.MONGOLAB_URI, { useMongoClient: true });

const redisClient = ttts.redis.createClient(
    parseInt(process.env.TEST_REDIS_PORT, 10),
    process.env.TEST_REDIS_HOST,
    {
        password: process.env.TEST_REDIS_KEY,
        tls: { servername: process.env.TEST_REDIS_HOST }
    });

ttts.service.itemAvailability.updatePerformanceOffersAvailability()(
    new ttts.repository.Stock(ttts.mongoose.connection),
    new ttts.repository.Performance(ttts.mongoose.connection),
    new ttts.repository.itemAvailability.SeatReservationOffer(redisClient),
    new ttts.repository.rateLimit.TicketTypeCategory(redisClient)
).then(() => {
    ttts.mongoose.disconnect();
    redisClient.quit();
});
