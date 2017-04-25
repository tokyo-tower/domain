import * as mongoose from 'mongoose';
import TicketTypeGroup from './ticketTypeGroup';

/**
 * 作品スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: {
            type: {
                ja: String,
                en: String
            },
            required: true
        },
        description: { // 説明
            ja: String,
            en: String
        },
        notes: { // 備考
            ja: String,
            en: String
        },
        sections: [
            {
                _id: false,
                code: String,
                name: {
                    ja: String,
                    en: String
                }
            }
        ],
        ticket_type_group: {
            type: String,
            ref: TicketTypeGroup.modelName,
            required: true
        },
        minutes: Number, // 上映時間
        is_mx4d: Boolean, // MX4D上映かどうか
        copyright: String // コピーライト
    },
    {
        collection: 'films',
        id: true,
        read: 'primaryPreferred',
        safe: <any>{ j: 1, w: 'majority', wtimeout: 10000 },
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

export default mongoose.model('Film', schema);
