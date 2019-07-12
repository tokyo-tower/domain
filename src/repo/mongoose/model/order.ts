import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

const customerSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const sellerSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const acceptedOfferSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const paymentMethodSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const discountSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const orderInquiryKeySchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 注文スキーマ
 * @ignore
 */
const schema = new mongoose.Schema(
    {
        typeOf: {
            type: String,
            required: true
        },
        seller: sellerSchema,
        customer: customerSchema,
        confirmationNumber: String,
        orderNumber: String,
        price: Number,
        priceCurrency: String,
        acceptedOffers: [acceptedOfferSchema],
        paymentMethods: [paymentMethodSchema],
        discounts: [discountSchema],
        url: String,
        orderStatus: String,
        orderDate: Date,
        isGift: Boolean,
        orderInquiryKey: orderInquiryKeySchema
    },
    {
        collection: 'orders',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: true,
        useNestedStrict: true,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

// 注文照会に使用
schema.index(
    {
        'orderInquiryKey.telephone': 1,
        'orderInquiryKey.paymentNo': 1,
        'orderInquiryKey.performanceDay': 1
    },
    { name: 'orderInquiryKey' }
);

schema.index(
    { createdAt: 1 },
    { name: 'searchByCreatedAt' }
);
schema.index(
    { updatedAt: 1 },
    { name: 'searchByUpdatedAt' }
);
// 注文番号はユニークなはず
schema.index(
    { orderNumber: 1 },
    {
        unique: true,
        name: 'uniqueOrderNumber'
    }
);

// 会員情報で注文検索
schema.index(
    {
        orderDate: 1,
        'customer.memberOf.membershipNumber': 1,
        'customer.memberOf.programName': 1
    },
    {
        name: 'searchOrdersByProgramMembership',
        partialFilterExpression: {
            'customer.memberOf.membershipNumber': { $exists: true },
            'customer.memberOf.programName': { $exists: true }
        }
    }
);

// 注文検索に使用
schema.index(
    {
        'seller.id': 1
    },
    {
        name: 'searchOrdersBySeller',
        partialFilterExpression: {
            'seller.id': { $exists: true }
        }
    }
);
// 注文検索に使用
schema.index(
    {
        orderNumber: 1,
        orderStatus: 1,
        orderDate: 1
    },
    {
        name: 'searchOrders'
    }
);
schema.index(
    {
        orderDate: 1
    },
    {
        name: 'searchOrdersByOrderDate'
    }
);
schema.index(
    {
        orderStatus: 1
    },
    {
        name: 'searchOrdersByOrderStatus'
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.id': 1
    },
    {
        name: 'searchOrdersByReservedEvent',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.id': { $exists: true }
        }
    }
);
schema.index(
    {
        confirmationNumber: 1
    },
    {
        name: 'searchOrdersByConfirmationNumber',
        partialFilterExpression: {
            confirmationNumber: { $exists: true }
        }
    }
);
schema.index(
    {
        'customer.id': 1
    },
    {
        name: 'searchByCustomerId',
        partialFilterExpression: {
            'customer.id': { $exists: true }
        }
    }
);
schema.index(
    {
        'customer.identifier': 1
    },
    {
        name: 'searchByCustomerIdentifier',
        partialFilterExpression: {
            'customer.identifier': { $exists: true }
        }
    }
);
schema.index(
    {
        'customer.memberOf.membershipNumber': 1
    },
    {
        name: 'searchByCustomerMemberhipNumber',
        partialFilterExpression: {
            'customer.memberOf.membershipNumber': { $exists: true }
        }
    }
);
schema.index(
    {
        'customer.givenName': 1
    },
    {
        name: 'searchByCustomerGivenName',
        partialFilterExpression: {
            'customer.givenName': { $exists: true }
        }
    }
);
schema.index(
    {
        'customer.familyName': 1
    },
    {
        name: 'searchByCustomerFamilyName',
        partialFilterExpression: {
            'customer.familyName': { $exists: true }
        }
    }
);
schema.index(
    {
        'customer.email': 1
    },
    {
        name: 'searchByCustomerEmail',
        partialFilterExpression: {
            'customer.email': { $exists: true }
        }
    }
);
schema.index(
    {
        'customer.telephone': 1
    },
    {
        name: 'searchByCustomerTelephone',
        partialFilterExpression: {
            'customer.telephone': { $exists: true }
        }
    }
);

schema.index(
    { confirmationNumber: 1, orderDate: -1 },
    {
        name: 'searchOrdersByConfirmationNumberAndOrderDate',
        partialFilterExpression: {
            confirmationNumber: { $exists: true }
        }
    }
);
schema.index(
    { 'customer.typeOf': 1, orderDate: -1 },
    {
        name: 'searchByCustomerTypeOfAndOrderDate',
        partialFilterExpression: {
            'customer.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'customer.id': 1, orderDate: -1 },
    {
        name: 'searchByCustomerIdAndOrderDate',
        partialFilterExpression: {
            'customer.id': { $exists: true }
        }
    }
);
schema.index(
    { 'customer.identifier': 1, orderDate: -1 },
    {
        name: 'searchByCustomerIdentifierAndOrderDate',
        partialFilterExpression: {
            'customer.identifier': { $exists: true }
        }
    }
);
schema.index(
    { 'customer.memberOf.membershipNumber': 1, orderDate: -1 },
    {
        name: 'searchByCustomerMemberhipNumberAndOrderDate',
        partialFilterExpression: {
            'customer.memberOf.membershipNumber': { $exists: true }
        }
    }
);
schema.index(
    { 'customer.givenName': 1, orderDate: -1 },
    {
        name: 'searchByCustomerGivenNameAndOrderDate',
        partialFilterExpression: {
            'customer.givenName': { $exists: true }
        }
    }
);
schema.index(
    { 'customer.familyName': 1, orderDate: -1 },
    {
        name: 'searchByCustomerFamilyNameAndOrderDate',
        partialFilterExpression: {
            'customer.familyName': { $exists: true }
        }
    }
);
schema.index(
    { 'customer.email': 1, orderDate: -1 },
    {
        name: 'searchByCustomerEmailAndOrderDate',
        partialFilterExpression: {
            'customer.email': { $exists: true }
        }
    }
);
schema.index(
    { 'customer.telephone': 1, orderDate: -1 },
    {
        name: 'searchByCustomerTelephoneAndOrderDate',
        partialFilterExpression: {
            'customer.telephone': { $exists: true }
        }
    }
);

schema.index(
    {
        'paymentMethods.typeOf': 1
    },
    {
        name: 'searchByPaymentMethodType',
        partialFilterExpression: {
            'paymentMethods.typeOf': { $exists: true }
        }
    }
);
schema.index(
    {
        'paymentMethods.paymentMethodId': 1
    },
    {
        name: 'searchByPaymentMethodId',
        partialFilterExpression: {
            'paymentMethods.paymentMethodId': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.id': 1
    },
    {
        name: 'searchByItemOfferedId',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.id': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.id': 1
    },
    {
        name: 'searchByItemOfferedReservationForId',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.id': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.name': 1
    },
    {
        name: 'searchByItemOfferedReservationForName',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.name': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.endDate': 1
    },
    {
        name: 'searchByItemOfferedReservationForEndDate',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.endDate': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.startDate': 1
    },
    {
        name: 'searchByItemOfferedReservationForStartDate',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.startDate': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.location.branchCode': 1
    },
    {
        name: 'searchByItemOfferedReservationForLocationBranchCode',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.location.branchCode': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.superEvent.id': 1
    },
    {
        name: 'searchByItemOfferedReservationForLocationSuperEventId',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.superEvent.id': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.superEvent.location.branchCode': 1
    },
    {
        name: 'searchByItemOfferedReservationForLocationSuperEventLocationBranchCode',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.superEvent.location.branchCode': { $exists: true }
        }
    }
);
schema.index(
    {
        'acceptedOffers.itemOffered.reservationFor.superEvent.workPerformed.identifier': 1
    },
    {
        name: 'searchByItemOfferedReservationForLocationSuperEventWorkPerformedIdentifier',
        partialFilterExpression: {
            'acceptedOffers.itemOffered.reservationFor.superEvent.workPerformed.identifier': { $exists: true }
        }
    }
);

export default mongoose.model('Order', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });
