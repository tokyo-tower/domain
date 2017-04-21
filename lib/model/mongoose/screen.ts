import * as mongoose from 'mongoose';
import Theater from './theater';

/**
 * スクリーンスキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        theater: {
            type: String,
            ref: Theater.modelName
        },
        name: {
            ja: String,
            en: String
        },
        seats_number: Number, // 座席合計数
        seats_numbers_by_seat_grade: [{ // 座席グレードごとの座席数
            _id: false,
            seat_grade_code: String, // 座席グレードコード
            seats_number: Number
        }],
        sections: [
            {
                _id: false,
                code: String,
                name: {
                    ja: String,
                    en: String
                },
                seats: [
                    {
                        _id: false,
                        code: String, // 座席コード
                        grade: {
                            code: String, // 座席グレードコード
                            name: {
                                ja: String, // 座席レベル名
                                en: String // 座席レベル名(英語)
                            },
                            additional_charge: Number // 追加料金
                        }
                    }
                ]
            }
        ]
    },
    {
        collection: 'screens',
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

export default mongoose.model('Screen', schema);
