import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

const extentedSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * パフォーマンススキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        theater: {
            type: mongoose.SchemaTypes.Mixed,
            required: true
        },
        theater_name: multilingualString,
        screen: {
            type: mongoose.SchemaTypes.Mixed,
            required: true
        },
        screen_name: multilingualString,
        film: {
            type: mongoose.SchemaTypes.Mixed,
            required: true
        },
        ticket_type_group: {
            type: mongoose.SchemaTypes.Mixed,
            required: true
        },
        day: String, // 上映日
        open_time: String, // 開演時刻
        start_time: String, // 上映開始時刻
        end_time: String, // 上映終了時刻
        canceled: Boolean, // 上映中止フラグ
        ttts_extension: extentedSchema, // 拡張情報
        door_time: Date,
        start_date: {
            type: Date,
            required: true
        },
        end_date: {
            type: Date,
            required: true
        },
        duration: String,
        tour_number: {
            type: String,
            required: true
        }
    },
    {
        collection: 'performances',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: false,
        useNestedStrict: true,
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
        day: 1,
        start_time: 1
    }
);
schema.index({ start_date: 1 });
schema.index({ end_date: 1 });

schema.index(
    { day: 1, start_time: 1, start_date: 1 },
    { name: 'searchPerformances-v2' }
);

export default mongoose.model('Performance', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });
