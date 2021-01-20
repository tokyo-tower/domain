
const ttts = require('../lib/index');
const moment = require('moment');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const performanceRepo = new ttts.repository.Performance(mongoose.connection);

    const result = await performanceRepo.performanceModel.deleteMany(
        { startDate: { $gte: moment('2021-01-21T00:00:00Z').toDate() } }
    )
        .exec();

    console.log(result);
}

main()
    .then()
    .catch(console.error);
