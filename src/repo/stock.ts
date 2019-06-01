import * as createDebug from 'debug';
import * as moment from 'moment';
import { Connection } from 'mongoose';
import * as redis from 'redis';

import * as factory from '@motionpicture/ttts-factory';
import StockModel from '../repo/mongoose/model/stock';

const debug = createDebug('chevre-domain:repo');

/**
 * 在庫数カウント結果インターフェース
 */
export interface ICountResult {
    _id: string;
    count: number;
}

/**
 * 在庫リポジトリ
 */
export class MongoRepository {
    private readonly stockModel: typeof StockModel;

    constructor(connection: Connection) {
        this.stockModel = connection.model(StockModel.modelName);
    }

    /**
     * まだなければ保管する
     */
    public async saveIfNotExists(stock: factory.stock.IStock) {
        await this.stockModel.findOneAndUpdate(
            {
                _id: stock.id,
                performance: stock.performance,
                seat_code: stock.seat_code
            },
            {
                // なければ作成
                $setOnInsert: stock
            },
            {
                upsert: true,
                new: true
            }
        ).exec();
    }

    /**
     * 在庫数をカウントする
     */
    public async count(params: {
        availability: factory.itemAvailability;
        performance: { ids: string[] };
    }): Promise<ICountResult[]> {
        return this.stockModel.aggregate(
            [
                {
                    $match: {
                        availability: params.availability,
                        performance: { $in: params.performance.ids }
                    }
                },
                {
                    $group: {
                        _id: '$performance',
                        count: { $sum: 1 }
                    }
                }
            ]
        ).exec();
    }

    /**
     * 在庫おさえ
     */
    public async lock(params: {
        performance: string;
        holder: string;
    }): Promise<factory.stock.IStock | null> {
        const doc = await this.stockModel.findOneAndUpdate(
            {
                performance: params.performance,
                availability: factory.itemAvailability.InStock
            },
            {
                availability: factory.itemAvailability.OutOfStock,
                holder: params.holder
            },
            { new: true }
        ).exec();

        return (doc !== null) ? doc.toObject() : null;
    }

    /**
     * 在庫解放
     */
    public async unlock(params: factory.reservation.event.IStock) {
        await this.stockModel.findOneAndUpdate(
            {
                _id: params.id,
                availability: params.availability_after,
                holder: params.holder // 対象取引に保持されている
            },
            {
                $set: { availability: params.availability_before },
                $unset: { holder: 1 }
            }
        ).exec();
    }
}

export interface IOffer {
    seatSection: string;
    seatNumber: string;
}
export interface ILockKey {
    eventId: string;
    offers: IOffer[];
    expires: Date;
    holder: string;
}

/**
 * 上映イベントに対する座席ごとの在庫状況を保管するリポジトリ
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'chevre:itemAvailability:screeningEvent';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 座席をロックする
     */
    public async lock(lockKey: ILockKey): Promise<void> {
        debug('locking...', lockKey);
        const key = `${RedisRepository.KEY_PREFIX}:${lockKey.eventId}`;
        const value = lockKey.holder;
        const multi = this.redisClient.multi();
        const fields = lockKey.offers.map((offer) => `${offer.seatSection}:${offer.seatNumber}`);

        fields.forEach((field) => {
            multi.hsetnx(key, field, value);
        });

        const results = await new Promise<any[]>((resolve, reject) => {
            multi.expireat(key, moment(lockKey.expires)
                .unix())
                .exec((err, reply) => {
                    debug('reply:', reply);
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve(reply);
                    }
                });
        });

        const lockedFields: string[] = [];
        results.slice(0, fields.length)
            .forEach((r, index) => {
                if (r === 1) {
                    lockedFields.push(fields[index]);
                }
            });
        debug('locked fields:', lockedFields);
        const lockedAll = lockedFields.length === fields.length;
        debug('lockedAll?', lockedAll);
        if (!lockedAll) {
            if (lockedFields.length > 0) {
                // 全て仮押さえできなければ仮押さえできたものは解除
                await new Promise<void>((resolve, reject) => {
                    this.redisClient.multi()
                        .hdel(key, lockedFields)
                        .exec((err, reply) => {
                            debug('reply:', reply);
                            if (err !== null) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                });
            }

            throw new factory.errors.AlreadyInUse('', [], 'Seat number already hold');
        }
    }

    /**
     * 座席ロックを解除する
     */
    public async unlock(params: {
        eventId: string;
        offer: IOffer;
    }) {
        const key = `${RedisRepository.KEY_PREFIX}:${params.eventId}`;
        const field = `${params.offer.seatSection}:${params.offer.seatNumber}`;
        await new Promise<void>((resolve, reject) => {
            this.redisClient.multi()
                .hdel(key, field)
                .exec((err, reply) => {
                    debug('reply:', reply);
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    /**
     * 空席でない座席を検索する
     */
    public async findUnavailableOffersByEventId(params: { eventId: string }) {
        const key = `${RedisRepository.KEY_PREFIX}:${params.eventId}`;

        return new Promise<IOffer[]>((resolve, reject) => {
            this.redisClient.hgetall(key, (err, reply) => {
                debug('reply:', reply);
                if (err !== null) {
                    reject(err);
                } else {
                    let offers: IOffer[] = [];
                    if (reply !== null) {
                        offers = Object.keys(reply)
                            .map((field) => {
                                const seatSection = field.split(':')[0];
                                const seatNumber = field.split(':')[1];

                                return { seatSection, seatNumber };
                            });
                    }
                    resolve(offers);
                }
            });
        });
    }

    /**
     * 保持者を取得する
     */
    public async getHolder(params: {
        eventId: string;
        offer: IOffer;
    }): Promise<string | null> {
        return new Promise<string | null>((resolve, reject) => {
            const key = `${RedisRepository.KEY_PREFIX}:${params.eventId}`;
            const field = `${params.offer.seatSection}:${params.offer.seatNumber}`;
            this.redisClient.hget(key, field, (err, result) => {
                debug('result:', err, result);
                if (err !== null) {
                    reject(err);
                } else {
                    // tslint:disable-next-line:no-magic-numbers
                    resolve(result);
                }
            });
        });
    }
}
