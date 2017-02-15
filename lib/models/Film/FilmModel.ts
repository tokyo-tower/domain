import * as mongoose from 'mongoose';
import TicketTypeGroup from '../TicketTypeGroup/TicketTypeGroupModel';

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
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

export default mongoose.model('Film', schema);
