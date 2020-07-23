import * as redis from 'redis';

import * as factory from '@tokyotower/factory';

// Nodeプロセス起動時に初期化
const checkinGates: factory.place.checkinGate.IPlace[] = [
    { identifier: 'DAITEN_AUTH', name: 'LANE' },
    { identifier: 'TOPDECK_AUTH', name: 'GATE' }
];

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
     * 入場場所を全て取得する
     */
    // tslint:disable-next-line:prefer-function-over-method
    public async findAll(): Promise<factory.place.checkinGate.IPlace[]> {
        return checkinGates;
    }
}
