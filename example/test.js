const ttts = require('../lib/index');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
    const count = await reservationRepo.reservationModel.countDocuments({
        status: ttts.factory.chevre.reservationStatusType.ReservationConfirmed,
        performance_day: { $exists: true },
        performance_start_time: { $exists: true },
        payment_no: { $exists: true },
        ticket_type: { $in: ["004", "005", "006"] }
    }).exec();
    console.log(count);


    const performanceIds = await reservationRepo.reservationModel.distinct(
        'performance',
        {
            status: ttts.factory.chevre.reservationStatusType.ReservationConfirmed,
            performance_day: { $exists: true },
            performance_start_time: { $exists: true },
            payment_no: { $exists: true },
            ticket_type: { $in: ["004", "005", "006"] }
        }
    ).exec();
    console.log(performanceIds);

    let i = 0;
    await Promise.all(performanceIds.map(async (performanceId) => {
        const reservationCount = await reservationRepo.reservationModel.countDocuments(
            {
                status: ttts.factory.chevre.reservationStatusType.ReservationConfirmed,
                performance: performanceId
            }
        ).exec();
        console.log('reservationCount:', reservationCount);
        if (reservationCount >= 36) {
            i += 1;
        }
    }));
    console.log(i);
}

main().then().catch(console.error);
