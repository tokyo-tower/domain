/**
 * オファーサービス
 */
import * as createDebug from 'debug';

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
        const performances = await performanceRepo.search(
            {
                startFrom: params.startFrom,
                startThrough: params.startThrough
            }
        );
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
