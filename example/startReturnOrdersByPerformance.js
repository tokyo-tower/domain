/**
 * パフォーマンスに対して注文返品を実行するサンプル
 * @ignore
 */

const ttts = require('../lib/index');

async function main() {
    ttts.mongoose.connect(process.env.MONGOLAB_URI);

    await ttts.service.order.startReturnByPerformance('5a31b288fca1c8737fdbb39f')(
        new ttts.repository.Performance(ttts.mongoose.connection),
        new ttts.repository.Reservation(ttts.mongoose.connection),
        new ttts.repository.Transaction(ttts.mongoose.connection)
    );

    ttts.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
