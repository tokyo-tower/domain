const cinerino = require('@cinerino/sdk');
const mongoose = require('mongoose');
const ttts = require('../lib/index');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const taskRepo = new ttts.repository.Task(mongoose.connection);

    const project = {
        typeOf: 'Project', id: ''
    };

    const eventService = new cinerino.service.Event({
        auth: new cinerino.auth.ClientCredentials({
            domain: process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
            clientId: process.env.CINERINO_CLIENT_ID,
            clientSecret: process.env.CINERINO_CLIENT_SECRET,
            scopes: [],
            state: ''
        }),
        endpoint: process.env.CINERINO_API_ENDPOINT
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

    const tasks = [];
    for (const event of events) {
        const importTask = {
            name: ttts.factory.taskName.ImportEvent,
            project: project,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: event
        };
        tasks.push(importTask);
        console.log('task created', event.id);
    }

    const result = await taskRepo.taskModel.insertMany(tasks, { ordered: false, rawResult: true });
    console.log('result:', { ...result, ops: undefined, insertedIds: undefined });
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
