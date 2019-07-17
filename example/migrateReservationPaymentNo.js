const ttts = require('../lib/index');
const moment = require('moment-timezone');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
    const cursor = await reservationRepo.reservationModel.find(
        {
            // modifiedTime: {
            //     $gte: moment().add(-3, 'months').toDate(),
            //     $lte: moment().toDate()
            // },
            updated_at: {
                $gte: moment().add(-3, 'months').toDate(),
                $lte: moment().toDate()
            }
        },
        {
            reservationNumber: 1,
            underName: 1
        }
    )
        // .sort({ modifiedTime: -1 })
        .cursor();
    console.log('reservations found');

    let i = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const reservation = doc.toObject();

        let property;
        if (reservation.underName !== undefined && Array.isArray(reservation.underName.identifier)) {
            property = reservation.underName.identifier.find((p) => p.name === 'paymentNo');
        }

        if (property === undefined) {
            await reservationRepo.reservationModel.findOneAndUpdate(
                { _id: reservation.id },
                {
                    $push: {
                        'underName.identifier': { name: 'paymentNo', value: reservation.reservationNumber }
                    }
                }
            ).exec();
            console.log('migrated', reservation.reservationNumber, reservation.id, i);
        } else {
            console.log('exists', reservation.reservationNumber, reservation.id, i);
        }
    });

    console.log(i, 'reservations migrated');
}

main()
    .then()
    .catch(console.error);
