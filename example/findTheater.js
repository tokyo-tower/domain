/**
 * 劇場検索
 * @ignore
 */

const ttts = require('../lib/index');

ttts.mongoose.connect(process.env.MONGOLAB_URI, {
    useMongoClient: true
});

ttts.Models.Theater.findOne({ _id: '001' }, (err, theater) => {
    console.log(err, theater);
    ttts.mongoose.disconnect();
});
