/**
 * クライアント作成サンプル
 *
 * @ignore
 */

import * as ttts from '../lib/index';
import * as bcrypt from 'bcryptjs';

async function main() {
    await ttts.mongoose.connect(<string>process.env.MONGOLAB_URI, {
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
    // tslint:disable-next-line:no-console
    console.log('success!');
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

