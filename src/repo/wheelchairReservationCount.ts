import * as createDebug from 'debug';
import * as moment from 'moment';
import * as redis from 'redis';

const debug = createDebug('ttts-domain:repository:wheelchairReservationCount');

/**
 * 車椅子予約カウントレポジトリー
 * @class respoitory.wheelchairReservationCount
 */
export class RedisRepository {
    public static SCOPE: string = 'wheelchairReservation';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    public static CREATE_COUNTER_UNIT_PARAMS(now: Date, aggregationUnitInSeconds: number) {
        const dateNow = moment(now);
        // tslint:disable-next-line:no-magic-numbers
        aggregationUnitInSeconds = parseInt(aggregationUnitInSeconds.toString(), 10);
        const validFrom = dateNow.unix() - dateNow.unix() % aggregationUnitInSeconds;
        const validThrough = validFrom + aggregationUnitInSeconds;

        return {
            identifier: `${RedisRepository.SCOPE}.${validFrom.toString()}`,
            validFrom: validFrom,
            validThrough: validThrough
        };
    }

    /**
     * カウントアップする
     * @param {Date} now 現在日時
     * @param {number} aggregationUnitInSeconds 集計単位(秒)
     */
    public async incr(now: Date, aggregationUnitInSeconds: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const issueUnitParams = RedisRepository.CREATE_COUNTER_UNIT_PARAMS(now, aggregationUnitInSeconds);
            const ttl = moment(now).diff(moment(issueUnitParams.validThrough), 'seconds');
            debug('incrementing...', issueUnitParams, ttl);

            this.redisClient.multi()
                .incr(issueUnitParams.identifier, debug)
                .expire(issueUnitParams.identifier, ttl, debug)
                .exec((err, results) => {
                    debug('results:', results);
                    if (err !== null) {
                        reject(err);
                    } else {
                        if (typeof results[0] !== 'number') {
                            throw new Error('Unexpected count type.');
                        }

                        // tslint:disable-next-line:no-magic-numbers
                        resolve(results[0]);
                    }
                });
        });
    }

    /**
     * カウントをリセットするカウントアップする
     * @param {Date} now 現在日時
     * @param {number} aggregationUnitInSeconds 集計単位(秒)
     */
    public async reset(now: Date, aggregationUnitInSeconds: number) {
        return new Promise<void>((resolve, reject) => {
            const issueUnitParams = RedisRepository.CREATE_COUNTER_UNIT_PARAMS(now, aggregationUnitInSeconds);

            this.redisClient.del(issueUnitParams.identifier, (err, results) => {
                debug('results:', results);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
