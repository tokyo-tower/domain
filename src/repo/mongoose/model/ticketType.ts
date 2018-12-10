import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';
import ticketCancelCharge from './schemaTypes/ticketCancelCharge';
import tttsExtensionTicketType from './schemaTypes/tttsExtensionTicketType';
const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 券種スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: multilingualString,
        description: multilingualString,
        notes: multilingualString,
        charge: Number, // 料金
        cancel_charge: {
            type: [ticketCancelCharge],
            default: []
        },
        ttts_extension: tttsExtensionTicketType,
        rate_limit_unit_in_seconds: Number
    },
    {
        collection: 'ticket_types',
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

export default mongoose.model('TicketType', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });
