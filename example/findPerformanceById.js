/**
 * IDでパフォーマンス検索するサンプル
 * @ignore
 */

const ttts = require('../lib/index');

ttts.mongoose.connect(process.env.MONGOLAB_URI, {
    useMongoClient: true
});

const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
performanceRepo.findById('171217000001001010945')
    .then((performance) => {
        console.log(performance);
        console.log(performance.ticket_type_group.ticket_types[0]);
        ttts.mongoose.disconnect();
    });