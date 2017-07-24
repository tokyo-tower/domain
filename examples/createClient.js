"use strict";
/**
 * クライアント作成サンプル
 *
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("../lib/index");
const bcrypt = require("bcryptjs");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield ttts.mongoose.connect(process.env.MONGOLAB_URI, {
            useMongoClient: true
        });
        const client = {
            id: 'motionpicture',
            secret_hash: yield bcrypt.hash('motionpicture', 10),
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
        yield ttts.Models.Client.findByIdAndUpdate(client.id, client, { upsert: true }).exec();
        yield ttts.mongoose.disconnect();
    });
}
main().then(() => {
    // tslint:disable-next-line:no-console
    console.log('success!');
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
