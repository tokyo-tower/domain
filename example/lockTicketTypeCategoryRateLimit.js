/**
 * 券種カテゴリーのレート制限ロックサンプル
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

const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);

const testholder = 'testholder';
const rateLimitKey = {
    performanceStartDate: new Date(),
    ticketTypeCategory: ttts.factory.ticketTypeCategory.Wheelchair,
    unitInSeconds: 3600
};

rateLimitRepo.getHolder(rateLimitKey)
    .then((holder) => {
        console.log('holder is', holder);

        rateLimitRepo.lock(rateLimitKey, testholder)
            .then(() => {
                console.log('locked.');

                rateLimitRepo.lock(rateLimitKey, testholder)
                    .catch((err) => {
                        console.error(err.message);

                        rateLimitRepo.getHolder(rateLimitKey)
                            .then((holder) => {
                                console.log('holder is', holder);

                                rateLimitRepo.unlock(rateLimitKey)
                                    .then(() => {
                                        console.log('unlocked.');

                                        rateLimitRepo.getHolder(rateLimitKey)
                                            .then((holder) => {
                                                console.log('holder is', holder);

                                                redisClient.quit();
                                            });
                                    });
                            });
                    });
            });
    });
