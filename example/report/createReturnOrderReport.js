const ttts = require('../../');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
    const aggregateSaleRepo = new ttts.repository.AggregateSale(ttts.mongoose.connection);

    const transaction = await transactionRepo.findReturnOrderById('5ac19ad3d4531f00382f2252');

    await ttts.service.aggregate.report4sales.createReturnOrderReport({ transaction })(
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
