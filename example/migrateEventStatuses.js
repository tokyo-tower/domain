
const cinerino = require('@cinerino/sdk');
const ttts = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const performanceRepo = new ttts.repository.Performance(mongoose.connection);

    const authClient = new cinerino.auth.OAuth2({
        domain: process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
        clientId: process.env.CINERINO_CLIENT_ID,
        clientSecret: process.env.CINERINO_CLIENT_SECRET,
        redirectUri: 'https://localhost/signIn',
        logoutUri: 'https://localhost/signOut'
    });
    authClient.setCredentials({
        refresh_token: process.env.CINERINO_REFRESH_TOKEN
    });

    const eventService = new cinerino.service.Event({
        auth: authClient,
        endpoint: process.env.CINERINO_API_ENDPOINT
    });

    const cursor = await performanceRepo.performanceModel.find(
        {
            // _id: { $eq: '200728001001012200' },
            startDate: {
                $gte: moment()
                    .add(-1, 'day')
                    .toDate()
            },
        },
        {
            _id: 1,
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

        let eventStatus;
        if (performance.ttts_extension.ev_service_status === ttts.factory.performance.EvServiceStatus.Suspended) {
            eventStatus = cinerino.factory.chevre.eventStatusType.EventCancelled;
        } else if (performance.ttts_extension.ev_service_status === ttts.factory.performance.EvServiceStatus.Slowdown) {
            eventStatus = cinerino.factory.chevre.eventStatusType.EventPostponed;
        }

        if (eventStatus !== undefined) {
            console.log('updating...', performance.id, performance.ttts_extension.ev_service_status, '->', eventStatus);
            updateCount += 1;

            await eventService.updatePartially({
                id: performance.id,
                eventStatus: eventStatus
            });
            console.log('updated', performance.id, i);
        }
    });

    console.log(i, 'performances checked');
    console.log(updateCount, 'performances updated');
}

main()
    .then()
    .catch(console.error);
