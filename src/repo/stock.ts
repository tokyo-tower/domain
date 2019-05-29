import { Connection } from 'mongoose';

import * as factory from '@motionpicture/ttts-factory';
import StockModel from '../repo/mongoose/model/stock';

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
