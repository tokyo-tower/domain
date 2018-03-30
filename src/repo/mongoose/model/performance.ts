import * as mongoose from 'mongoose';

import Film from './film';
import multilingualString from './schemaTypes/multilingualString';
import Screen from './screen';
import Theater from './theater';
import TicketTypeGroup from './ticketTypeGroup';

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
        theater: { // 劇場ID
            type: String,
            ref: Theater.modelName,
            required: true
        },
        theater_name: multilingualString,
        screen: { // スクリーンID
            type: String,
            ref: Screen.modelName,
            required: true
        },
        screen_name: multilingualString,
        film: { // 作品ID
            type: String,
            ref: Film.modelName,
            required: true
        },
        ticket_type_group: { // 券種グループID
            type: String,
            ref: TicketTypeGroup.modelName,
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
        strict: true,
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
    { canceled: 1, day: 1, start_time: 1, start_date: 1 },
    { name: 'searchPerformances' }
);

export default mongoose.model('Performance', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            console.error(error);
        }
    });
