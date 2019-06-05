import * as redis from 'redis';

/**
 * 座席予約オファーの在庫状況リポジトリ
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'seatReservationOfferAvailability';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 特定パフォーマンスの特定券種に対する在庫数を保管する
     */
    public async save(performanceId: string, ticketTypeId: string, availableNum: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const ttl = 1800;
            const key = `${RedisRepository.KEY_PREFIX}${performanceId}`;

            this.redisClient.multi()
                .hset(key, ticketTypeId, availableNum.toString())
                .expire(key, ttl)
                .exec((err, _) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    /**
     * 特定パフォーマンスの特定券種に対する在庫数を保管する
     */
    public async findById(performanceId: string, ticketTypeId: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const key = `${RedisRepository.KEY_PREFIX}${performanceId}`;

            this.redisClient.hget(key, ticketTypeId, (err, result) => {
                if (err !== null) {
                    reject(err);
                } else {
                    // tslint:disable-next-line:no-magic-numbers
                    resolve((result !== null) ? parseInt(result, 10) : 0);
                }
            });
        });
    }

    /**
     * 特定パフォーマンスの特定券種に対する在庫数を保管する
     */
    public async findByPerformance(performanceId: string): Promise<IAvailabilitiesByTicketType> {
        return new Promise<IAvailabilitiesByTicketType>((resolve, reject) => {
            const key = `${RedisRepository.KEY_PREFIX}${performanceId}`;

            this.redisClient.hgetall(key, (err, result) => {
                if (err !== null) {
                    reject(err);
                } else {
                    // tslint:disable-next-line:no-magic-numbers
                    const availabilities: IAvailabilitiesByTicketType = {};
                    if (result !== null) {
                        Object.keys(result).forEach((ticketTypeId) => {
                            // tslint:disable-next-line:no-magic-numbers
                            availabilities[ticketTypeId] = parseInt(result[ticketTypeId], 10);
                        });
                    }

                    resolve(availabilities);
                }
            });
        });
    }
}

export interface IAvailabilitiesByTicketType {
    [ticketTypeId: string]: number;
}
