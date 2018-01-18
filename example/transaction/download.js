/**
 * download transactions csv example
 * @ignore
 */

const moment = require('moment');
const ttts = require('../../');

ttts.mongoose.connect(process.env.MONGOLAB_URI);

ttts.service.transaction.placeOrder.download(
    {
        startFrom: moment().add(-6, 'hours').toDate(),
        startThrough: moment().toDate(),
    },
    'csv'
)(new ttts.repository.Transaction(ttts.mongoose.connection))
    .then(async (csv) => {
        const fileName = `ttts-line-assistant-transactions-${moment().format('YYYYMMDDHHmmss')}.csv`;
        const url = await ttts.service.util.uploadFile({
            fileName: fileName,
            text: csv
        })();
        console.log('csv is here:\n', url);

        ttts.mongoose.disconnect();
    });