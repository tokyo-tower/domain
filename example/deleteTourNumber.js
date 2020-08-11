
const cinerino = require('@cinerino/sdk');
const ttts = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const performanceRepo = new ttts.repository.Performance(mongoose.connection);

    const result = await performanceRepo.performanceModel.updateMany(
        {
            _id: { $exists: true },
            tourNumber: { $exists: true }
        },
        {
            $unset: { tourNumber: 1 }
        }
    )
        .exec();

    console.log('updated', result);
}

main()
    .then()
    .catch(console.error);
