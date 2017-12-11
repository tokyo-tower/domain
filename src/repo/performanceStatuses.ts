import * as redis from 'redis';
import { PerformanceStatuses } from '../factory/performanceStatuses';

/**
 * パフォーマンス在庫状況レポジトリー
 * @class repository.performanceStatuses
 */
export class RedisRepository {
    public static REDIS_KEY: string = 'TTTSSeatStatusesByPerformanceId';
    public static EXPIRES_IN_SECONDS: number = 3600;

    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * ストレージに保管する
     * @memberof RedisRepository
     */
    public async store(performanceStatuses: PerformanceStatuses): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.redisClient.setex(
                RedisRepository.REDIS_KEY,
                RedisRepository.EXPIRES_IN_SECONDS,
                JSON.stringify(performanceStatuses),
                (err: any) => {
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * ストレージから検索する
     * @memberof PerformanceStatusesModel
     */
    public async find(): Promise<PerformanceStatuses> {
        return new Promise<PerformanceStatuses>((resolve, reject) => {
            this.redisClient.get(RedisRepository.REDIS_KEY, (err, reply) => {
                if (err instanceof Error) {
                    reject(err);

                    return;
                }

                if (reply === null) {
                    reject(new Error('not found'));

                    return;
                }

                const performanceStatuses = new PerformanceStatuses();

                try {
                    const performanceStatusesModelInRedis = JSON.parse(reply.toString());
                    Object.keys(performanceStatusesModelInRedis).forEach((propertyName) => {
                        performanceStatuses.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
                    });
                } catch (error) {
                    reject(error);

                    return;
                }

                resolve(performanceStatuses);
            });
        });
    }
}
