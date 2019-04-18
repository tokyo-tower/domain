import * as factory from '@motionpicture/ttts-factory';
import * as createDebug from 'debug';
import * as redis from 'redis';

const debug = createDebug('ttts-domain:repository');

export type IOffer = factory.offer.seatReservation.ITicketType;

/**
 * イベントごとの販売情報インターフェース
 */
export interface IOffersByEvent {
    [eventId: string]: IOffer[];
}

/**
 * 展示イベントの販売情報リポジトリー
 * @class repository:offer:ExhibitionEvent
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'exhibitionEventOffer';

    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 販売情報を保管する
     * @param {IOffersByEvent} offers 販売情報
     * @param {number} ttl 保管期間
     */
    public async store(offers: IOffersByEvent, ttl: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            const filedsAndValues = Object.keys(offers).reduce((a, b) => [...a, b, JSON.stringify(offers[b])], []);
            debug('storing exhibitionEventOffer...');
            this.redisClient.multi()
                .hmset(key, filedsAndValues)
                .expire(key, ttl)
                .exec((err, __) => {
                    debug('exhibitionEventOffer stored.', err);
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    /**
     * 特定のイベントの販売情報を取得する
     * @param {string} eventId イベントID
     */
    public async findByEventId(eventId: string): Promise<IOffer[]> {
        return new Promise<IOffer[]>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hget(key, eventId, (err, result) => {
                if (err !== null) {
                    reject(err);
                } else {
                    if (result === null) {
                        reject(new factory.errors.NotFound('exhibitionEventOffer'));
                    } else {
                        resolve(JSON.parse(result));
                    }
                }
            });
        });
    }

    /**
     * 全イベントの販売情報を取得する
     */
    public async findAll(): Promise<IOffersByEvent> {
        return new Promise<IOffersByEvent>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;

            this.redisClient.hgetall(key, (err, result) => {
                debug('checkinGates on redis found.', err);
                if (err !== null) {
                    reject(err);
                } else {
                    const offers: IOffersByEvent = {};
                    if (result !== null) {
                        Object.keys(result).forEach((eventId) => {
                            offers[eventId] = JSON.parse(result[eventId]);
                        });
                    }

                    resolve(offers);
                }
            });
        });
    }
}
