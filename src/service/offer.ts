/**
 * 販売情報サービス
 * @namespace service.offer
 */

import * as createDebug from 'debug';

import * as factory from '@motionpicture/ttts-factory';

import { IOffersByEvent, RedisRepository as ExhibitionEventOfferRepo } from '../repo/offer/exhibitionEvent';
import { MongoRepository as PerformanceRepo } from '../repo/performance';

const debug = createDebug('ttts-domain:service');

export type IUpdateExhibitionEventOffersOperation<T> = (
    performanceRepo: PerformanceRepo,
    offerRepo: ExhibitionEventOfferRepo
) => Promise<T>;

/**
 * 展示イベントの販売情報を更新する
 */
export function updateExhibitionEventOffers(params: {
    startFrom: Date;
    startThrough: Date;
    ttl: number;
}): IUpdateExhibitionEventOffersOperation<void> {
    return async (
        performanceRepo: PerformanceRepo,
        offerRepo: ExhibitionEventOfferRepo
    ) => {
        debug('finding performances...');
        const performances = await performanceRepo.performanceModel.find(
            {
                start_date: {
                    $gt: params.startFrom,
                    $lt: params.startThrough
                }
            }
        )
            .exec().then((docs) => docs.map((doc) => <factory.performance.IPerformanceWithDetails>doc.toObject()));
        debug(performances.length, 'performances found.');

        const offers: IOffersByEvent = {};
        performances.forEach((performance) => {
            offers[performance.id] = performance.ticket_type_group.ticket_types;
        });

        debug('storing offers...');
        await offerRepo.store(offers, params.ttl);
        debug('offers stored.');
    };
}
