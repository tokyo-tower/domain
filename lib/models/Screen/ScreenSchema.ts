import mongoose = require('mongoose');

/**
 * スクリーンスキーマ
 */
let Schema = new mongoose.Schema({
    _id: String,
    theater: { 
        type: String,
        ref: 'Theater'
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
                 en: String,
             },
             seats: [
                 {
                     _id: false,
                     code: String, // 座席コード
                     grade: {
                         code: String, // 座席グレードコード
                         name: {
                            ja: String, // 座席レベル名
                            en: String, // 座席レベル名(英語)
                         },
                         additional_charge: Number // 追加料金
                     }
                 },
             ]
        },
    ]
},{
    collection: 'screens',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default Schema;