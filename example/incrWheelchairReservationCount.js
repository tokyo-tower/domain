/**
 * パフォーマンス空席状況を更新するスクリプトの例
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

const countRepo = new ttts.repository.WheelchairReservationCount(redisClient);

const now = new Date();
const AGGREGATION_UNIT_IN_SECONDS = 60;

countRepo.findByDate(now, AGGREGATION_UNIT_IN_SECONDS)
    .then((count) => {
        console.log('count is', count);

        countRepo.incr(now, AGGREGATION_UNIT_IN_SECONDS)
            .then((count) => {
                console.log('incremented.', count);

                countRepo.decr(now, AGGREGATION_UNIT_IN_SECONDS)
                    .then((count) => {
                        console.log('decremented.', count);

                        countRepo.findByDate(now, AGGREGATION_UNIT_IN_SECONDS)
                            .then((count) => {
                                console.log('count is', count);

                                countRepo.reset(now, AGGREGATION_UNIT_IN_SECONDS)
                                    .then(() => {
                                        console.log('reset.');

                                        countRepo.findByDate(now, AGGREGATION_UNIT_IN_SECONDS)
                                            .then((count) => {
                                                console.log('count is', count);

                                                redisClient.quit();
                                            });
                                    });
                            });
                    });
            });
    });
