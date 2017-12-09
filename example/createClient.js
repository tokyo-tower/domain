/**
 * クライアント作成サンプル
 * @ignore
 */

const ttts = require('../lib/index');
const bcrypt = require('bcrypt');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI, {
        useMongoClient: true
    });

    const client = {
        id: 'motionpicture',
        secret_hash: await bcrypt.hash('motionpicture', 10),
        name: {
            en: 'motionpicture',
            ja: 'モーションピクチャー'
        },
        description: {
            en: 'motionpicture',
            ja: 'モーションピクチャー'
        },
        notes: {
            en: 'motionpicture',
            ja: 'モーションピクチャー'
        },
        email: 'hello@motionpicture,jp'
    };

    await ttts.Models.Client.findByIdAndUpdate(client.id, client, { upsert: true }).exec();

    await ttts.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

