/**
 * 入場場所を保管するサンプル
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

const ownerRepo = new ttts.repository.Owner(ttts.mongoose.connection);
const checkinGateRepo = new ttts.repository.place.CheckinGate(redisClient);

ownerRepo.ownerModel.find({ notes: '1' })
    .exec().then(async (owners) => {
        const checkinGates = owners.map((owner) => {
            return {
                identifier: owner.get('group'),
                name: owner.get('description')
            };
        });

        await Promise.all(checkinGates.map(async (checkinGate) => {
            await checkinGateRepo.store(checkinGate);
        }));

        const checkinGatesOnRedis = await checkinGateRepo.findAll();
        console.log('checkinGates found.', checkinGatesOnRedis);

        ttts.mongoose.disconnect();
        redisClient.quit();
    });

