/**
 * GMO健康診断サンプル
 * @ignore
 */

const moment = require('moment');
const ttts = require('../../');

async function main() {
    ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const report = await ttts.service.report.health.checkGMOSales(
        moment().add(-24, 'hours').toDate(),
        moment().toDate()
    )(
        new ttts.repository.GMONotification(ttts.mongoose.connection),
        new ttts.repository.Transaction(ttts.mongoose.connection)
        );
    console.log('report:', report);

    ttts.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
