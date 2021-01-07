import * as mongoose from 'mongoose';

const modelName = 'Reservation';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 予約スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,

        checkins: { // 入場履歴
            type: [{
                _id: false,
                when: Date, // いつ
                where: String, // どこで
                why: String, // 何のために
                how: String, // どうやって
                id: String
            }],
            default: []
        },

        // 以下Chevreのスキーマを継承
        typeOf: String,
        additionalTicketText: String,
        bookingAgent: mongoose.SchemaTypes.Mixed,
        bookingTime: Date,
        cancelReservationUrl: String,
        checkinUrl: String,
        confirmReservationUrl: String,
        modifiedTime: Date,
        modifyReservationUrl: String,
        numSeats: Number,
        price: mongoose.SchemaTypes.Mixed,
        priceCurrency: String,
        programMembershipUsed: String,
        project: mongoose.SchemaTypes.Mixed,
        reservationFor: mongoose.SchemaTypes.Mixed,
        reservationNumber: String,
        reservationStatus: String,
        reservedTicket: mongoose.SchemaTypes.Mixed,
        underName: mongoose.SchemaTypes.Mixed,
        checkedIn: { type: Boolean, default: false },
        attended: { type: Boolean, default: false },
        additionalProperty: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'reservations',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: false,
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: {
            getters: false,
            virtuals: false,
            minimize: false,
            versionKey: false
        },
        toObject: {
            getters: false,
            virtuals: true,
            minimize: false,
            versionKey: false
        }
    }
);

// 予約管理アプリケーションでの新しい予約検索
schema.index(
    {
        reservationStatus: 1,
        'reservationFor.startDate': 1,
        reservationNumber: 1,
        'reservedTicket.ticketType.id': 1,
        'reservedTicket.ticketedSeat.seatNumber': 1
    },
    {
        name: 'searchOnStaffApplication',
        partialFilterExpression: {
            reservationStatus: { $exists: true },
            'reservationFor.startDate': { $exists: true },
            reservationNumber: { $exists: true },
            'reservedTicket.ticketType.id': { $exists: true },
            'reservedTicket.ticketedSeat.seatNumber': { $exists: true }
        }
    }
);

schema.index(
    { modifiedTime: -1 },
    { name: 'searchByModifiedTime-v2' }
);

schema.index(
    { 'project.id': 1, modifiedTime: -1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { reservationNumber: 1, modifiedTime: -1 },
    { name: 'searchByReservationNumber-v2' }
);

schema.index(
    { reservationStatus: 1, modifiedTime: -1 },
    { name: 'searchByReservationStatus-v2' }
);

schema.index(
    { additionalProperty: 1, modifiedTime: -1 },
    {
        name: 'searchByAdditionalProperty',
        partialFilterExpression: {
            additionalProperty: { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForId-v2',
        partialFilterExpression: {
            'reservationFor.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.startDate': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForStartDate-v2',
        partialFilterExpression: {
            'reservationFor.startDate': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.endDate': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForEndDate',
        partialFilterExpression: {
            'reservationFor.endDate': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatNumber': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatNumber',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatNumber': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatRow': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatRow',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatRow': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatSection': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatSection',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatSection': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketType.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketTypeId',
        partialFilterExpression: {
            'reservedTicket.ticketType.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketType.category.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketTypeCategoryId',
        partialFilterExpression: {
            'reservedTicket.ticketType.category.id': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.id': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameId',
        partialFilterExpression: {
            'underName.id': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.email': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameEmail',
        partialFilterExpression: {
            'underName.email': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.name': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameName',
        partialFilterExpression: {
            'underName.name': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.familyName': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameFamilyName',
        partialFilterExpression: {
            'underName.familyName': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.givenName': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameGivenName',
        partialFilterExpression: {
            'underName.givenName': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.telephone': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameTelephone',
        partialFilterExpression: {
            'underName.telephone': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.identifier': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameIdentifier',
        partialFilterExpression: {
            'underName.identifier': { $exists: true }
        }
    }
);

schema.index(
    { additionalTicketText: 1, modifiedTime: -1 },
    {
        name: 'searchByAdditionalTicketText',
        partialFilterExpression: {
            additionalTicketText: { $exists: true }
        }
    }
);

mongoose.model(modelName, schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });

export { modelName, schema };
