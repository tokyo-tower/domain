/**
 * イベント予約集計
 */
const mongoose = require('mongoose');
const ttts = require('../lib/index');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    await ttts.service.aggregate.aggregateEventReservations({
        id: '191115001001011745'
    })({
        performance: new ttts.repository.Performance(mongoose.connection),
        reservation: new ttts.repository.Reservation(mongoose.connection)
    });

    await new Promise((resolve) => {
        setTimeout(
            async () => {
                await mongoose.disconnect();
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

