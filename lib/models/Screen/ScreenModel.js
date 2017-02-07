"use strict";
const mongoose = require("mongoose");
const TheaterModel_1 = require("../Theater/TheaterModel");
let Schema = new mongoose.Schema({
    _id: String,
    theater: {
        type: String,
        ref: TheaterModel_1.default.modelName
    },
    name: {
        ja: String,
        en: String
    },
    seats_number: Number,
    seats_numbers_by_seat_grade: [{
            _id: false,
            seat_grade_code: String,
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
                    code: String,
                    grade: {
                        code: String,
                        name: {
                            ja: String,
                            en: String,
                        },
                        additional_charge: Number
                    }
                },
            ]
        },
    ]
}, {
    collection: 'screens',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mongoose.model("Screen", Schema);
