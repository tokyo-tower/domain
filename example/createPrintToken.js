/**
 * 印刷トークンを発行するサンプル
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

const tokenRepo = new ttts.repository.Token(redisClient);
tokenRepo.createPrintToken(['TT-171222-100210-0'])
    .then(async (token) => {
        console.log('token created.', token);

        const reservationIds = await tokenRepo.verifyPrintToken(token);
        console.log('token verified.', reservationIds);
    }).catch((err) => {
        console.error(err);
    }).then(() => {
        redisClient.quit();
    });
