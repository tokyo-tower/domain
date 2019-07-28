/**
 * 注文返品プロセスサンプル
 */
const ttts = require('../lib/index');

async function main() {
    ttts.mongoose.connect(process.env.MONGOLAB_URI);

    await ttts.service.task.executeByName(ttts.factory.taskName.ReturnOrder)(
        new ttts.repository.Task(mongoose.connection),
        mongoose.connection
    );

    ttts.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
