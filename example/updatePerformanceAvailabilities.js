/**
 * パフォーマンスの在庫状況更新サンプル
 * @ignore
 */

const ttts = require('../lib/index');
const moment = require('moment');

ttts.mongoose.connect(process.env.MONGOLAB_URI, { useMongoClient: true });

const redisClient = ttts.redis.createClient(
    Number(process.env.REDIS_PORT),
    process.env.REDIS_HOST,
    {
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });

ttts.service.itemAvailability.updatePerformanceAvailabilities({
    startFrom: moment().toDate(),
    startThrough: moment().add(3, 'days').toDate(),
    ttl: 3600
})(
    new ttts.repository.Stock(redisClient),
    new ttts.repository.Performance(ttts.mongoose.connection),
    new ttts.repository.itemAvailability.Performance(redisClient)
).catch((err) => {
    console.error(err);
}).then(() => {
});
