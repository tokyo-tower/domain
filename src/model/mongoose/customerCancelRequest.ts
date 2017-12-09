import * as mongoose from 'mongoose';
import * as CommonUtil from '../../util/common';
import multilingualString from './schemaTypes/multilingualString';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * 一般キャンセルリクエストスキーマ
 */
const schema = new mongoose.Schema(
    {
        reservation: { // 予約情報
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        tickets: { // チケット
            type: [{
                _id: false,
                seat_code: String,
                seat_grade_name: multilingualString,
                seat_grade_additional_charge: Number,
                ticket_type: String,
                ticket_type_name: multilingualString,
                ticket_type_charge: Number,
                charge: Number
            }],
            default: []
        },
        cancel_name: {
            type: String,
            required: true
        },
        cancellation_fee: Number
    },
    {
        collection: 'customer_cancel_requests',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);
// tslint:disable-next-line:no-function-expression
schema.static('getTickets', function(reservaions: any[]) {
    const tickets: any[] = [];
    // チケット情報キーセット
    const copyKeys: string[] = [
        'seat_code',
        'seat_grade_name',
        'seat_grade_additional_charge',
        'ticket_type',
        'ticket_type_name',
        'ticket_type_charge',
        'charge'
    ];
    reservaions.map((reservaion) => {
        // 指定キーのみチケット情報としてコピー
        tickets.push(CommonUtil.parseFromKeys(reservaion, copyKeys));
    });

    return tickets;
});

export default mongoose.model('CustomerCancelRequest', schema);
