import * as AWS from 'aws-sdk';
import * as createDebug from 'debug';
import * as redis from 'redis';

import * as factory from '@tokyotower/factory';

import { credentials } from '../../credentials';

const debug = createDebug('ttts-domain:repository');

// Nodeプロセス起動時に初期化
let checkinGates: factory.place.checkinGate.IPlace[] = [];

// Cognitoからグループリストを取得して、入場ゲートリポジトリーに保管する
// tslint:disable-next-line:no-floating-promises
getCognitoGroups()
    .then((groups) => {
        checkinGates = groups.map((group) => {
            return {
                identifier: <string>group.GroupName,
                name: <string>group.Description
            };
        });
        // debug('storing checkinGates...', checkinGates);

        // await Promise.all(checkinGates.map(async (checkinGate) => {
        //     try {
        //         await checkinGateRepo.store(checkinGate);
        //     } catch (error) {
        //         // tslint:disable-next-line:no-console
        //         console.error(error);
        //     }
        // }));
    });

/**
 * 入場ゲートリポジトリ
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'checkinGates';

    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 入場場所を保管する
     */
    // public async store(checkinGate: factory.place.checkinGate.IPlace): Promise<void> {
    //     return new Promise<void>((resolve, reject) => {
    //         const key = RedisRepository.KEY_PREFIX;
    //         const ttl = 3600;

    //         this.redisClient.multi()
    //             .hset(key, checkinGate.identifier, JSON.stringify(checkinGate))
    //             .expire(key, ttl)
    //             .exec((err, results) => {
    //                 debug('results:', results);
    //                 if (err !== null) {
    //                     reject(err);
    //                 } else {
    //                     resolve();
    //                 }
    //             });
    //     });
    // }

    /**
     * 入場場所を全て取得する
     */
    // tslint:disable-next-line:prefer-function-over-method
    public async findAll(): Promise<factory.place.checkinGate.IPlace[]> {
        return checkinGates;
        // return new Promise<factory.place.checkinGate.IPlace[]>((resolve, reject) => {
        //     const key = RedisRepository.KEY_PREFIX;

        //     this.redisClient.hgetall(key, (err, result) => {
        //         debug('checkinGates on redis found.', err);
        //         if (err !== null) {
        //             reject(err);
        //         } else {
        //             resolve((result !== null) ? Object.keys(result).map((identifier) => JSON.parse(result[identifier])) : []);
        //         }
        //     });
        // });
    }
}

async function getCognitoGroups() {
    return new Promise<AWS.CognitoIdentityServiceProvider.GroupListType>((resolve, reject) => {
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
            apiVersion: 'latest',
            region: 'ap-northeast-1',
            accessKeyId: credentials.aws.accessKeyId,
            secretAccessKey: credentials.aws.secretAccessKey
        });

        cognitoIdentityServiceProvider.listGroups(
            {
                UserPoolId: <string>process.env.ADMINS_USER_POOL_ID
            },
            (err, data) => {
                debug('listGroups result:', err, data);
                if (err instanceof Error) {
                    reject(err);
                } else {
                    if (data.Groups === undefined) {
                        reject(new Error('Unexpected.'));
                    } else {
                        resolve(data.Groups);
                    }
                }
            });
    });
}
