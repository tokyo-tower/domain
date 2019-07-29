/**
 * イベント予約集計
 */
const ttts = require('../lib/index');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);
    const redisClient = ttts.redis.createClient({
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });

    await ttts.service.aggregate.aggregateEventReservations({
        id: '190613001001011500'
    })({
        checkinGate: new ttts.repository.place.CheckinGate(redisClient),
        eventWithAggregation: new ttts.repository.EventWithAggregation(redisClient),
        performance: new ttts.repository.Performance(mongoose.connection),
        reservation: new ttts.repository.Reservation(mongoose.connection),
        stock: new ttts.repository.Stock(redisClient),
        ticketTypeCategoryRateLimit: new ttts.repository.rateLimit.TicketTypeCategory(redisClient)
    });

    await new Promise((resolve) => {
        setTimeout(
            async () => {
                await ttts.mongoose.disconnect();
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

