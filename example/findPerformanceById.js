/**
 * IDでパフォーマンス検索するサンプル
 */
const ttts = require('../lib/index');

ttts.mongoose.connect(process.env.MONGOLAB_URI, {
    useMongoClient: true
});

const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
performanceRepo.findById('171225001001021000')
    .then((performance) => {
        console.log(performance);
        console.log(performance.ticket_type_group.ticket_types[0]);
    })
    .catch((err) => {
        console.error(err);
    })
    .then(() => {
        // ttts.mongoose.disconnect();
    });