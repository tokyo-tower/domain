/**
 * 販売情報サービス
 * @namespace service.offer
 */

import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '@motionpicture/ttts-factory';

import { IOffersByEvent, RedisRepository as ExhibitionEventOfferRepo } from '../repo/offer/exhibitionEvent';
import { MongoRepository as PerformanceRepo } from '../repo/performance';

const debug = createDebug('ttts-domain:service:offer');

export type IUpdateExhibitionEventOffersOperation<T> = (
    performanceRepo: PerformanceRepo,
    offerRepo: ExhibitionEventOfferRepo
) => Promise<T>;

/**
 * 展示イベントの販売情報を更新する
 * @memberof service.offer
 */
export function updateExhibitionEventOffers(searchEventsPeriodInDays: number, ttl: number): IUpdateExhibitionEventOffersOperation<void> {
    return async (
        performanceRepo: PerformanceRepo,
        offerRepo: ExhibitionEventOfferRepo
    ) => {
        const now = moment();
        debug('finding performances...');
        const performances = await performanceRepo.performanceModel.find(
            {
                start_date: {
                    $gt: now.toDate(),
                    $lt: moment(now).add(searchEventsPeriodInDays, 'days').toDate()
                }
            }
        )
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .exec().then((docs) => docs.map((doc) => <factory.performance.IPerformanceWithDetails>doc.toObject()));
        debug(performances.length, 'performances found.');

        const offers: IOffersByEvent = {};
        performances.forEach((performance) => {
            offers[performance.id] = performance.ticket_type_group.ticket_types;
        });

        debug('storing offers...');
        await offerRepo.store(offers, ttl);
        debug('offers stored.');
    };
}
