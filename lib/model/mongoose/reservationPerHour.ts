import * as mongoose from 'mongoose';
const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * パフォーマンススキーマ
 */
const schema = new mongoose.Schema(
    {
        // 来塔日
        performance_day: {
            type: String,
            required: true
        },
        // 来塔時間帯(1時間単位)
        performance_hour: {
            type: String,
            required: true
        },
        // チケット種別 ('0':通常 '1':車椅子)
        ticket_category: {
            type: String,
            default: '0',
            required: true
        },
        // 予約ステータス
        status: {
            type: String,
            required: true
        },
        expired_at: Date, // 仮予約期限
        reservation_id: String // 予約ID
    },
    {
        collection: 'reservations_per_hour',
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

schema.index(
    {
        performance_day: 1,
        performance_hour: 1
    },
    {
        unique: true
    }
);

export default mongoose.model('ReservationPerHour', schema);
