
const cinerino = require('@cinerino/sdk');
const ttts = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reportRepo = new ttts.repository.Report(mongoose.connection);

    const cursor = await reportRepo.aggregateSaleModel.find(
        {
            // _id: { $eq: '200728001001012200' },
            date_bucket: {
                $gte: moment()
                    .add(-2, 'years')
                    .toDate()
            },
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('reports found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const report = doc.toObject();

        if (report.reservation === undefined
            || report.reservation === null
            || report.reservation.reservationFor === undefined
            || report.reservation.reservationFor === null) {
            const startDate = moment(`${report.performance.startDay}${report.performance.startTime}00+09:00`, 'YYYYMMDDHHmmssZ')
                .toDate();

            const update = {
                confirmationNumber: String(report.payment_no),
                'reservation.reservationFor': {
                    id: String(report.performance.id),
                    startDate
                },
                'reservation.reservedTicket': {
                    ticketedSeat: { seatNumber: String(report.seat.code) },
                    ticketType: {
                        csvCode: String(report.ticketType.csvCode),
                        name: { ja: String(report.ticketType.name) },
                        priceSpecification: { price: Number(report.ticketType.charge) }
                    }

                },
            };
            console.log('updating...', report.date_bucket, startDate);
            updateCount += 1;

            await reportRepo.aggregateSaleModel.findByIdAndUpdate(
                report.id,
                update
            )
                .exec();
            console.log('updated', report.date_bucket, i);
        } else {
            console.log('already migrated', report.date_bucket);
        }
    });

    console.log(i, 'reports checked');
    console.log(updateCount, 'reports updated');
}

main()
    .then()
    .catch(console.error);
