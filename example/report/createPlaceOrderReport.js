const ttts = require('../../');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
    const aggregateSaleRepo = new ttts.repository.AggregateSale(ttts.mongoose.connection);

    const transaction = await transactionRepo.findPlaceOrderById('5b0ff8220707f300387d8ebf');

    await ttts.service.aggregate.report4sales.createPlaceOrderReport({ transaction })(
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
