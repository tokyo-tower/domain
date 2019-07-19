import * as factory from '@tokyotower/factory';
import { Connection } from 'mongoose';
import OrderModel from './mongoose/model/order';

/**
 * 注文レポジトリー
 */
export class MongoRepository {
    public readonly orderModel: typeof OrderModel;

    constructor(connection: Connection) {
        this.orderModel = connection.model(OrderModel.modelName);
    }
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.order.ISearchConditions) {
        const andConditions: any[] = [
            // 注文日時の範囲条件
            {
                orderDate: {
                    $exists: true
                }
            }
        ];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.orderDateFrom instanceof Date) {
            andConditions.push({
                orderDate: { $gte: params.orderDateFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.orderDateThrough instanceof Date) {
            andConditions.push({
                orderDate: { $lte: params.orderDateThrough }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.seller !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.seller.typeOf !== undefined) {
                andConditions.push({
                    'seller.typeOf': {
                        $exists: true,
                        $eq: params.seller.typeOf
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.seller.ids)) {
                andConditions.push({
                    'seller.id': {
                        $exists: true,
                        $in: params.seller.ids
                    }
                });
            }
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.customer !== undefined) {
            if (params.customer.typeOf !== undefined) {
                andConditions.push({
                    'customer.typeOf': {
                        $exists: true,
                        $eq: params.customer.typeOf
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.customer.ids)) {
                andConditions.push({
                    'customer.id': {
                        $exists: true,
                        $in: params.customer.ids
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.customer.identifiers)) {
                andConditions.push({
                    'customer.identifier': {
                        $exists: true,
                        $in: params.customer.identifiers
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.customer.membershipNumbers)) {
                andConditions.push({
                    'customer.memberOf.membershipNumber': {
                        $exists: true,
                        $in: params.customer.membershipNumbers
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.customer.givenName !== undefined) {
                andConditions.push({
                    'customer.givenName': {
                        $exists: true,
                        $regex: new RegExp(params.customer.givenName, 'i')
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.customer.familyName !== undefined) {
                andConditions.push({
                    'customer.familyName': {
                        $exists: true,
                        $regex: new RegExp(params.customer.familyName, 'i')
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.customer.email !== undefined) {
                andConditions.push({
                    'customer.email': {
                        $exists: true,
                        $regex: new RegExp(params.customer.email, 'i')
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.customer.telephone !== undefined) {
                andConditions.push({
                    'customer.telephone': {
                        $exists: true,
                        $regex: new RegExp(params.customer.telephone, 'i')
                    }
                });
            }
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.orderNumbers)) {
            andConditions.push({
                orderNumber: { $in: params.orderNumbers }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.orderStatuses)) {
            andConditions.push({
                orderStatus: { $in: params.orderStatuses }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.confirmationNumbers)) {
            andConditions.push({
                confirmationNumber: {
                    $exists: true,
                    $in: params.confirmationNumbers
                }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.acceptedOffers !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.acceptedOffers.itemOffered !== undefined) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (Array.isArray(params.acceptedOffers.itemOffered.ids)) {
                    andConditions.push({
                        'acceptedOffers.itemOffered.id': {
                            $exists: true,
                            $in: params.acceptedOffers.itemOffered.ids
                        }
                    });
                }

                const reservationForConditions = params.acceptedOffers.itemOffered.reservationFor;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (reservationForConditions !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (Array.isArray(reservationForConditions.ids)) {
                        andConditions.push({
                            'acceptedOffers.itemOffered.reservationFor.id': {
                                $exists: true,
                                $in: reservationForConditions.ids
                            }
                        });
                    }
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (reservationForConditions.name !== undefined) {
                        andConditions.push({
                            $or: [
                                {
                                    'acceptedOffers.itemOffered.reservationFor.name.ja': {
                                        $exists: true,
                                        $regex: new RegExp(reservationForConditions.name, 'i')
                                    }
                                },
                                {
                                    'acceptedOffers.itemOffered.reservationFor.name.en': {
                                        $exists: true,
                                        $regex: new RegExp(reservationForConditions.name, 'i')
                                    }
                                }
                            ]
                        });
                    }
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (reservationForConditions.location !== undefined) {
                        if (Array.isArray(reservationForConditions.location.branchCodes)) {
                            andConditions.push({
                                'acceptedOffers.itemOffered.reservationFor.location.branchCode': {
                                    $exists: true,
                                    $in: reservationForConditions.location.branchCodes
                                }
                            });
                        }
                    }
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (reservationForConditions.superEvent !== undefined) {
                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (Array.isArray(reservationForConditions.superEvent.ids)) {
                            andConditions.push({
                                'acceptedOffers.itemOffered.reservationFor.superEvent.id': {
                                    $exists: true,
                                    $in: reservationForConditions.superEvent.ids
                                }
                            });
                        }
                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (reservationForConditions.superEvent.location !== undefined) {
                            if (Array.isArray(reservationForConditions.superEvent.location.branchCodes)) {
                                andConditions.push({
                                    'acceptedOffers.itemOffered.reservationFor.superEvent.location.branchCode': {
                                        $exists: true,
                                        $in: reservationForConditions.superEvent.location.branchCodes
                                    }
                                });
                            }
                        }
                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (reservationForConditions.superEvent.workPerformed !== undefined) {
                            if (Array.isArray(reservationForConditions.superEvent.workPerformed.identifiers)) {
                                andConditions.push({
                                    'acceptedOffers.itemOffered.reservationFor.superEvent.workPerformed.identifier': {
                                        $exists: true,
                                        $in: reservationForConditions.superEvent.workPerformed.identifiers
                                    }
                                });
                            }
                        }
                    }
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (reservationForConditions.inSessionFrom instanceof Date) {
                        andConditions.push({
                            'acceptedOffers.itemOffered.reservationFor.endDate': {
                                $exists: true,
                                $gt: reservationForConditions.inSessionFrom.toISOString()
                            }
                        });
                    }
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (reservationForConditions.inSessionThrough instanceof Date) {
                        andConditions.push({
                            'acceptedOffers.itemOffered.reservationFor.startDate': {
                                $exists: true,
                                $lt: reservationForConditions.inSessionThrough.toISOString()
                            }
                        });
                    }
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (reservationForConditions.startFrom instanceof Date) {
                        andConditions.push({
                            'acceptedOffers.itemOffered.reservationFor.startDate': {
                                $exists: true,
                                $gte: reservationForConditions.startFrom.toISOString()
                            }
                        });
                    }
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (reservationForConditions.startThrough instanceof Date) {
                        andConditions.push({
                            'acceptedOffers.itemOffered.reservationFor.startDate': {
                                $exists: true,
                                $lt: reservationForConditions.startThrough.toISOString()
                            }
                        });
                    }
                }
            }
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.paymentMethods !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.paymentMethods.typeOfs)) {
                andConditions.push({
                    'paymentMethods.typeOf': {
                        $exists: true,
                        $in: params.paymentMethods.typeOfs
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.paymentMethods.paymentMethodIds)) {
                andConditions.push({
                    'paymentMethods.paymentMethodId': {
                        $exists: true,
                        $in: params.paymentMethods.paymentMethodIds
                    }
                });
            }
        }

        return andConditions;
    }

    public async save(order: factory.order.IOrder) {
        await this.orderModel.findOneAndUpdate(
            {
                orderNumber: order.orderNumber
            },
            order,
            { upsert: true }
        ).exec();
    }

    /**
     * 注文番号から注文を取得する
     */
    public async findByOrderNumber(params: { orderNumber: string }): Promise<factory.order.IOrder> {
        const doc = await this.orderModel.findOne(
            { orderNumber: params.orderNumber },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        ).exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Order');
        }

        return doc.toObject();
    }

    public async count(params: factory.order.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.orderModel.count(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
            .exec();
    }
    /**
     * 注文を検索する
     */
    public async search(params: factory.order.ISearchConditions): Promise<factory.order.IOrder[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.orderModel.find(
            { $and: conditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        );
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit).skip(params.limit * (params.page - 1));
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 }).exec().then((docs) => docs.map((doc) => doc.toObject()));
    }
}
