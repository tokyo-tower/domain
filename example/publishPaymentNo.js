/**
 * 購入番号を発行するサンプル
 * @ignore
 */

const ttts = require('../lib/index');

const redisClient = ttts.redis.createClient(
    parseInt(process.env.TEST_REDIS_PORT, 10),
    process.env.TEST_REDIS_HOST,
    {
        password: process.env.TEST_REDIS_KEY,
        tls: { servername: process.env.TEST_REDIS_HOST }
    });

const paymentNoRepo = new ttts.repository.PaymentNo(redisClient);
paymentNoRepo.publish('20180102')
    .then(async (paymentNo) => {
        console.log('paymentNo published.', paymentNo);
    }).catch((err) => {
        console.error(err);
    }).then(() => {
        redisClient.quit();
    });
