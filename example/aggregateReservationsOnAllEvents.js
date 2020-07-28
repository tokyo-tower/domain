
const ttts = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { typeOf: 'Project', id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const performanceRepo = new ttts.repository.Performance(mongoose.connection);
    const taskRepo = new ttts.repository.Task(mongoose.connection);

    const cursor = await performanceRepo.performanceModel.find(
        {
            // _id: { $eq: '200728001001012200' },
            startDate: {
                $gte: moment()
                    .add(-1, 'week')
                    // .add(+88, 'days')
                    .toDate()
            },
        },
        {
            _id: 1
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('events found');

    const tasks = [];
    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const performance = doc.toObject();

        console.log('creating task...', performance.id);
        updateCount += 1;

        const aggregateTask = {
            name: ttts.factory.taskName.AggregateEventReservations,
            project: project,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { id: performance.id }
        };
        tasks.push(aggregateTask);

        console.log('task created', performance.id, i);
    });

    console.log(i, 'performances checked');

    const result = await taskRepo.taskModel.insertMany(tasks, { ordered: false, rawResult: true });

    console.log('result:', { ...result, ops: undefined, insertedIds: undefined });
    console.log(updateCount, 'performances task created');
}

main()
    .then()
    .catch(console.error);
