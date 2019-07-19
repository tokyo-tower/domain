import * as chevre from '@chevre/api-nodejs-client';
import * as factory from '@tokyotower/factory';
// import * as createDebug from 'debug';

// import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { MongoRepository as SellerRepo } from '../repo/seller';

import { credentials } from '../credentials';

// const debug = createDebug('ttts-domain:service');

const chevreAuthClient = new chevre.auth.ClientCredentials({
    domain: credentials.chevre.authorizeServerDomain,
    clientId: credentials.chevre.clientId,
    clientSecret: credentials.chevre.clientSecret,
    scopes: [],
    state: ''
});

export type ISearchEventOffersOperation<T> = (repos: {
    // event: EventRepo;
    project: ProjectRepo;
}) => Promise<T>;

export type ISearchEventTicketOffersOperation<T> = (repos: {
    // event: EventRepo;
    project: ProjectRepo;
    seller: SellerRepo;
}) => Promise<T>;

/**
 * イベントに対する座席オファーを検索する
 */
export function searchEventOffers(params: {
    project: { id: string };
    event: { id: string };
}): ISearchEventOffersOperation<factory.chevre.event.screeningEvent.IScreeningRoomSectionOffer[]> {
    return async (repos: {
        // event: EventRepo;
        project: ProjectRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        if (project.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (project.settings.chevre === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const eventService = new chevre.service.Event({
            endpoint: project.settings.chevre.endpoint,
            auth: chevreAuthClient
        });

        // 基本的にはCHEVREへ空席確認
        return eventService.searchOffers({ id: params.event.id });
    };
}

/**
 * イベントに対する券種オファーを検索する
 */
export function searchEventTicketOffers(params: {
    project: { id: string };
    /**
     * どのイベントに対して
     */
    event: { id: string };
    /**
     * どの販売者に対して
     */
    seller?: { typeOf: factory.organizationType; id: string };
    /**
     * どの店舗に対して
     */
    store?: { id: string };
    /**
     * どの決済方法に対して
     */
    // paymentMethod?: IAcceptedPaymentMethod;
}): ISearchEventTicketOffersOperation<factory.chevre.event.screeningEvent.ITicketOffer[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        // event: EventRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });
        if (project.settings === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (project.settings.chevre === undefined) {
            throw new factory.errors.ServiceUnavailable('Project settings not found');
        }

        const eventService = new chevre.service.Event({
            endpoint: project.settings.chevre.endpoint,
            auth: chevreAuthClient
        });

        let offers: factory.chevre.event.screeningEvent.ITicketOffer[];

        // Chevreで券種オファーを検索
        offers = await eventService.searchTicketOffers({ id: params.event.id });

        // 店舗条件によって対象を絞る
        // if (params.seller.typeOf !== factory.organizationType.MovieTheater) {
        //     throw new factory.errors.Argument('seller', `Seller type ${params.seller.typeOf} not acceptable`);
        // }
        // const seller = await repos.seller.findById({ id: params.seller.id });

        // const specifiedStore = params.store;
        // if (specifiedStore !== undefined && Array.isArray(seller.areaServed)) {
        //     // 店舗指定がある場合、販売者の対応店舗を確認
        //     const store = seller.areaServed.find((area) => area.id === specifiedStore.id);
        //     debug('store is', store);
        //     // 販売者の店舗に登録されていなければNotFound
        //     if (store === undefined) {
        //         throw new factory.errors.NotFound('Store', 'Store not found in a seller\'s served area');
        //     }
        // }

        return offers;
    };
}
