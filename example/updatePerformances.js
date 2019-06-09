const ttts = require('../lib/index');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
    await performanceRepo.performanceModel.update(
        { day: { $gt: '20190904' } },
        { canceled: false },
        { multi: true }
    ).exec();
}

main().then().catch(console.error);
