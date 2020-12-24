import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 売上集計スキーマ
 */
const schema = new mongoose.Schema(
    {
        /**
         * 予約ID
         */
        reservation: mongoose.SchemaTypes.Mixed,
        /**
         * 購入番号
         */
        payment_no: String,
        /**
         * 購入座席インデックス
         * @deprecated
         */
        payment_seat_index: Number, // 購入座席インデックス
        performance: mongoose.SchemaTypes.Mixed,
        seat: mongoose.SchemaTypes.Mixed,
        ticketType: mongoose.SchemaTypes.Mixed,
        customer: mongoose.SchemaTypes.Mixed,
        orderDate: Date,
        paymentMethod: String,
        checkedin: String,
        checkinDate: String,
        reservationStatus: String,
        status_sort: String,
        price: String,
        cancellationFee: Number,
        date_bucket: Date
    },
    {
        collection: 'aggregateSales',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
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

// 検索
schema.index(
    { date_bucket: 1 },
    { name: 'searchByDateBucket' }
);

schema.index(
    { 'performance.startDay': 1 },
    { name: 'searchByPerformanceStartDay' }
);

// ソートindex
schema.index(
    {
        'performance.startDay': 1, // トライ回数の少なさ優先
        'performance.startTime': 1, // 実行予定日時の早さ優先
        payment_no: 1,
        reservationStatus: -1,
        'seat.code': 1,
        status_sort: 1
    },
    {
        name: 'sort4report'
    }
);
schema.index(
    { 'performance.id': 1 },
    { name: 'searchByPerformanceId' }
);
schema.index(
    { payment_no: 1 },
    { name: 'searchByPaymentNo' }
);
schema.index(
    { payment_seat_index: 1 },
    { name: 'searchByPaymentSeatIndex' }
);
schema.index(
    { reservationStatus: 1 },
    { name: 'searchByReservationStatus' }
);

schema.index(
    { 'reservation.id': 1, date_bucket: 1 },
    {
        name: 'searchByReservationId',
        partialFilterExpression: {
            'reservation.id': { $exists: true }
        }
    }
);

schema.index(
    { 'customer.group': 1, date_bucket: 1 },
    {
        name: 'searchByCustomerGroup',
        partialFilterExpression: {
            'customer.group': { $exists: true }
        }
    }
);

export default mongoose.model('AggregateSale', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });
