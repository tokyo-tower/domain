
const ttts = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const util = require('util');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reportRepo = new ttts.repository.Report(mongoose.connection);

    const cursor = await reportRepo.aggregateSaleModel.find(
        {
            // _id: { $eq: '200728001001012200' },
            orderDate: {
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

        if (report.mainEntity === undefined
            || report.mainEntity === null) {
            const update = {
                mainEntity: {
                    typeOf: 'Order',
                    confirmationNumber: report.confirmationNumber,
                    customer: report.customer,
                    orderDate: moment(report.orderDate)
                        .toDate(),
                    paymentMethod: report.paymentMethod,
                    price: Number(report.price)
                },
                amount: Number(report.price),
                dateRecorded: moment(report.orderDate)
                    .toDate()
            };
            console.log('updating...', report.orderDate, update);
            updateCount += 1;

            await reportRepo.aggregateSaleModel.findByIdAndUpdate(
                report.id,
                update
            )
                .exec();
            console.log('updated', report.orderDate, i);
        } else {
            console.log('already migrated', report.orderDate);
        }
    });

    console.log(i, 'reports checked');
    console.log(updateCount, 'reports updated');
}

main()
    .then()
    .catch(console.error);
