const cinerinoapi = require('@cinerino/api-nodejs-client');
const mongoose = require('mongoose');
const ttts = require('../lib/index');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const taskRepo = new ttts.repository.Task(mongoose.connection);

    const project = {
        typeOf: 'Project', id: 'ttts-production'
    };

    const eventService = new ttts.chevre.service.Event({
        auth: new ttts.chevre.auth.ClientCredentials({
            domain: process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
            clientId: process.env.CHEVRE_CLIENT_ID,
            clientSecret: process.env.CHEVRE_CLIENT_SECRET,
            scopes: [],
            state: ''
        }),
        endpoint: process.env.CHEVRE_API_ENDPOINT
    });

    const now = new Date();

    const events = [];
    const limit = 100;
    let page = 0;

    while (limit * page === events.length) {
        page += 1;
        console.log('searching...', page);

        const searchResult = await eventService.search({
            limit: 100,
            page: page,
            typeOf: ttts.factory.chevre.eventType.ScreeningEvent,
            project: { ids: [project.id] },
            startFrom: now
        });
        events.push(...searchResult.data);
    }

    // console.log(events);
    console.log(events.length);
    // return;

    for (const event of events) {
        const aggregateTask = {
            name: ttts.factory.taskName.AggregateEventReservations,
            project: project,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { id: event.id }
        };
        await taskRepo.save(aggregateTask);
        console.log('task created', event.id);
    }
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
