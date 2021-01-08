import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * パフォーマンススキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String
    },
    {
        collection: 'performances',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: false, // Chevreからイベントインポート後に拡張可能なように柔軟に
        useNestedStrict: true,
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: {
            getters: false,
            virtuals: false,
            minimize: false,
            versionKey: false
        },
        toObject: {
            getters: false,
            virtuals: true,
            minimize: false,
            versionKey: false
        }
    }
);

schema.index(
    { startDate: 1 },
    { name: 'searchByStartDate' }
);

schema.index(
    { 'project.id': 1, startDate: 1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, startDate: 1 },
    { name: 'searchByTypeOf' }
);

schema.index(
    { eventStatus: 1, startDate: 1 },
    { name: 'searchByEventStatus' }
);

schema.index(
    { name: 1, startDate: 1 },
    { name: 'searchByName' }
);

schema.index(
    { endDate: 1, startDate: 1 },
    { name: 'searchByEndDate' }
);

schema.index(
    { 'ttts_extension.online_sales_update_at': 1, startDate: 1 },
    { name: 'searchByOnlineSalesUpdateAt' }
);

schema.index(
    { 'ttts_extension.refund_status': 1, startDate: 1 },
    { name: 'searchByRefundStatus' }
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
