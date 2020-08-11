
const cinerino = require('@cinerino/sdk');
const ttts = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const performanceRepo = new ttts.repository.Performance(mongoose.connection);

    const cursor = await performanceRepo.performanceModel.find(
        {
            _id: { $exists: true },
            // startDate: {
            //     $gte: moment()
            //         .add(-1, 'day')
            //         .toDate()
            // },
        },
        {
            _id: 1,
            eventStatus: 1,
            ttts_extension: 1
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('events found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const performance = doc.toObject();

        const evServiceStatus = performance.ttts_extension.ev_service_status;

        let eventStatus = cinerino.factory.chevre.eventStatusType.EventScheduled;
        if (evServiceStatus === ttts.factory.performance.EvServiceStatus.Suspended) {
            eventStatus = cinerino.factory.chevre.eventStatusType.EventCancelled;
        } else if (evServiceStatus === ttts.factory.performance.EvServiceStatus.Slowdown) {
            eventStatus = cinerino.factory.chevre.eventStatusType.EventPostponed;
        }

        if (eventStatus !== performance.eventStatus) {
            console.log('updating...', performance.id, evServiceStatus, '->', eventStatus);
            updateCount += 1;

            await performanceRepo.performanceModel.findOneAndUpdate(
                { _id: performance.id },
                { eventStatus: eventStatus }
            )
                .exec();
            console.log('updated', performance.id, i);
        } else {
            console.log('already set', performance.id, eventStatus, performance.eventStatus);
        }
    });

    console.log(i, 'performances checked');
    console.log(updateCount, 'performances updated');
}

main()
    .then()
    .catch(console.error);
