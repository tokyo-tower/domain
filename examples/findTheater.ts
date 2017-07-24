/**
 * 劇場検索
 *
 * @ignore
 */
import * as mongoose from 'mongoose';
import * as TTTS from '../lib/index';

mongoose.connect(<string>process.env.MONGOLAB_URI, {
    useMongoClient: true
});

TTTS.Models.Theater.findOne({ _id: '001' }, (err, theater) => {
    // tslint:disable-next-line:no-console
    console.log(err, theater);
    // mongoose.disconnect();
});
