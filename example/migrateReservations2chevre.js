const ttts = require('../lib/index');
const MongoClient = require('mongodb').MongoClient;
const moment = require('moment-timezone');

const project = {
    typeOf: 'Project',
    id: process.env.PROJECT_ID
};

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: false });

    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
    const cursor = await reservationRepo.reservationModel.find(
        {
            "reservationStatus": "ReservationConfirmed",
            "reservationFor.startDate": {
                "$exists": true,
                "$gte": moment("2019-07-20T15:00:00.000Z").toDate()
            }
            // modifiedTime: {
            //     $gte: moment().add(-3, 'months').toDate(),
            //     $lte: moment().toDate()
            // },
            // updated_at: {
            //     $gte: moment().add(-3, 'months').toDate(),
            //     $lte: moment().toDate()
            // }
        }
    )
        // .sort({ modifiedTime: -1 })
        .cursor();
    console.log('reservations found');

    const chevreClient = await MongoClient.connect(process.env.CHEVRE_MONGOLAB_URI);
    console.log("Connected successfully to server");
    const chevreDB = chevreClient.db('chevre');
    const collection = chevreDB.collection('reservations');

    let i = 0;
    await cursor.eachAsync(async (doc) => {
        const reservation = doc.toObject();

        if (reservation.id.slice(0, 4) === 'TTT-' || reservation.id.slice(0, 3) === 'TT-') {
            i += 1;
            const insertingDoc = {
                ...reservation,
                _id: reservation.id,
                project: project,
                createdAt: reservation.created_at,
                updatedAt: reservation.updated_at
            };
            delete insertingDoc.checkins;
            delete insertingDoc.created_at;
            delete insertingDoc.updated_at;
            delete insertingDoc.id;

            // Insert some documents
            try {
                console.log('inserting', reservation.id);
                await collection.findOneAndReplace(
                    { _id: insertingDoc._id },
                    insertingDoc,
                    { upsert: true }
                );
                console.log(reservation.id, 'migrated');
            } catch (error) {
                console.error(reservation.id, error.message);
            }
        }
    });

    console.log(i, 'reservations migrated');
}

main()
    .then()
    .catch(console.error);
