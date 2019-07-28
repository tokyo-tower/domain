const ttts = require('../../');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
    const aggregateSaleRepo = new ttts.repository.AggregateSale(mongoose.connection);

    const reservation = await reservationRepo.reservationModel.findById('TT-180301-302136-0').exec();

    await ttts.service.aggregate.report4sales.updateOrderReportByReservation({ reservation })(
        aggregateSaleRepo
    );

    await ttts.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
