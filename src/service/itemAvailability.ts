/**
 * 在庫状況サービス
 * @namespace service.itemAvailability
 */

import * as createDebug from 'debug';

import ItemAvailability from '../factory/itemAvailability';
import { PerformanceStatuses } from '../factory/performanceStatuses';

import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { RedisRepository as PerformanceStatusesRepo } from '../repo/performanceStatuses';
import { MongoRepository as StockRepo } from '../repo/stock';

const debug = createDebug('ttts-domain:service:itemAvailability');

export type IStockAndPerformanceAndPerformanceStatusesOperation<T> = (
    stockRepo: StockRepo,
    performanceRepo: PerformanceRepo,
    performanceStatusesRepo: PerformanceStatusesRepo
) => Promise<T>;

/**
 * 空席ステータスを更新する
 * @memberof service.itemAvailability
 */
export function updatePerformanceStatuses(): IStockAndPerformanceAndPerformanceStatusesOperation<void> {
    return async (
        stockRepo: StockRepo,
        performanceRepo: PerformanceRepo,
        performanceStatusesRepo: PerformanceStatusesRepo
    ) => {
        debug('finding performances...');
        const performances = await performanceRepo.performanceModel.find(
            {},
            'day start_time screen'
        ).populate('screen', 'seats_number').exec();
        debug('performances found.');

        const performanceStatuses = new PerformanceStatuses();

        // パフォーマンスごとに在庫数を集計
        debug('aggregating...');
        const results: any[] = await stockRepo.stockModel.aggregate(
            [
                {
                    $match: {
                        availability: ItemAvailability.InStock
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

        // パフォーマンスIDごとに
        const reservationNumbers: {
            [key: string]: number
        } = {};
        results.forEach((result) => {
            // tslint:disable-next-line:no-magic-numbers
            reservationNumbers[result._id] = parseInt(result.count, 10);
        });

        performances.forEach((performance) => {
            // パフォーマンスごとに空席ステータスを算出する
            if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                reservationNumbers[performance.get('_id').toString()] = 0;
            }

            // 空席ステータス変更(空席数("予約可能"な予約データ数)をそのままセット)
            const reservationNumber: number = reservationNumbers[performance.get('_id')];
            performanceStatuses.setStatus(performance._id.toString(), reservationNumber.toString());
        });

        debug('saving performanceStatusesModel...', performanceStatuses);
        await performanceStatusesRepo.store(performanceStatuses);
        debug('performanceStatusesModel saved.');
    };
}
