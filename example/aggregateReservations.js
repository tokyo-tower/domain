/**
 * イベント予約集計
 */
const mongoose = require('mongoose');
const ttts = require('../lib/index');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);
    const redisClient = ttts.redis.createClient({
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });

    await ttts.service.aggregate.aggregateEventReservations({
        id: '191115001001011745'
    })({
        checkinGate: new ttts.repository.place.CheckinGate(redisClient),
        eventWithAggregation: new ttts.repository.EventWithAggregation(redisClient),
        performance: new ttts.repository.Performance(mongoose.connection),
        project: new ttts.repository.Project(mongoose.connection),
        reservation: new ttts.repository.Reservation(mongoose.connection),
        ticketTypeCategoryRateLimit: new ttts.repository.rateLimit.TicketTypeCategory(redisClient)
    });

    await new Promise((resolve) => {
        setTimeout(
            async () => {
                await mongoose.disconnect();
                redisClient.quit(resolve);
            },
            5000
        );
    });
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

