/**
 * 展示イベントの販売情報を更新する
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

const offerRepo = new ttts.repository.offer.ExhibitionEvent(redisClient);
ttts.service.offer.updateExhibitionEventOffers(3, 3600)(
    new ttts.repository.Performance(ttts.mongoose.connection),
    offerRepo
).then(async () => {
    console.log('offers updated.');

    const offersByEvent = await offerRepo.findAll();
    console.log('offersByEvent', offersByEvent);
}).catch((err) => {
    console.error(err);
}).then(() => {
    ttts.mongoose.disconnect();
    redisClient.quit();
});
