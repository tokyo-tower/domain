
const ttts = require('../lib/index');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reportRepo = new ttts.repository.Report(mongoose.connection);

    const result = await reportRepo.aggregateSaleModel.updateMany(
        { _id: { $exists: true } },
        {
            $unset: {
                date_bucket: 1,
                payment_no: 1,
                performance: 1,
                reservationStatus: 1,
                seat: 1,
                status_sort: 1,
                ticketType: 1,
            }
        },
    )
        .exec();

    console.log(result);
}

main()
    .then()
    .catch(console.error);
