import * as mongoose from 'mongoose';

/**
 * 券種スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: {
            ja: String, // 券種名
            en: String // 券種名(英語)
        },
        description: { // 説明
            ja: String,
            en: String
        },
        notes: { // 備考
            ja: String,
            en: String
        },
        charge: Number // 料金
    },
    {
        collection: 'ticket_types',
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

export default mongoose.model('TicketType', schema);
