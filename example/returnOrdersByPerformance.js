/**
 * パフォーマンスに対して注文返品を実行するサンプル
 * @ignore
 */

const ttts = require('../lib/index');

async function main() {
    ttts.mongoose.connect(process.env.MONGOLAB_URI);

    await ttts.service.order.returnAllByPerformance('5a31b289fca1c8737fdbb5f4')(
        new ttts.repository.Performance(ttts.mongoose.connection),
        new ttts.repository.Task(ttts.mongoose.connection)
    );

    ttts.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
