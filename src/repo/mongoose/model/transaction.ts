import * as factory from '@tokyotower/factory';
import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

const objectSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const resultSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const agentSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const sellerSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const errorSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 取引スキーマ
 */
const schema = new mongoose.Schema(
    {
        status: String,
        typeOf: String,
        agent: agentSchema,
        seller: sellerSchema,
        error: errorSchema,
        result: resultSchema,
        object: objectSchema,
        expires: Date,
        startDate: Date,
        endDate: Date,
        tasksExportedAt: Date,
        tasksExportationStatus: String
    },
    {
        collection: 'transactions',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: true,
        useNestedStrict: true,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

schema.index(
    { createdAt: 1 },
    { name: 'searchByCreatedAt' }
);
schema.index(
    { updatedAt: 1 },
    { name: 'searchByUpdatedAt' }
);

schema.index(
    { typeOf: 1, startDate: -1 },
    { name: 'searchByTypeOf-v2' }
);
schema.index(
    { status: 1, startDate: -1 },
    { name: 'searchByStatus-v2' }
);
schema.index(
    { startDate: -1 },
    { name: 'searchByStartDate-v2' }
);
schema.index(
    { endDate: 1, startDate: -1 },
    {
        name: 'searchByEndDate-v2',
        partialFilterExpression: {
            endDate: { $exists: true }
        }
    }
);
schema.index(
    { expires: 1, startDate: -1 },
    { name: 'searchByExpires-v2' }
);
schema.index(
    { tasksExportationStatus: 1, startDate: -1 },
    { name: 'searchByTasksExportationStatus-v2' }
);
schema.index(
    { tasksExportedAt: 1, startDate: -1 },
    {
        name: 'searchByTasksExportedAt-v2',
        partialFilterExpression: {
            tasksExportedAt: { $exists: true }
        }
    }
);
schema.index(
    { 'result.order.orderNumber': 1, startDate: -1 },
    {
        name: 'searchByResultOrderNumber',
        partialFilterExpression: {
            'result.order.orderNumber': { $exists: true }
        }
    }
);
schema.index(
    { 'object.order.orderNumber': 1, startDate: -1 },
    {
        name: 'searchByObjectOrderNumber',
        partialFilterExpression: {
            'object.order.orderNumber': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.typeOf': 1, startDate: -1 },
    {
        name: 'searchByAgentTypeOf',
        partialFilterExpression: {
            'agent.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.id': 1, startDate: -1 },
    {
        name: 'searchByAgentId',
        partialFilterExpression: {
            'agent.id': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.identifier': 1, startDate: -1 },
    {
        name: 'searchByAgentIdentifier',
        partialFilterExpression: {
            'agent.identifier': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.familyName': 1, startDate: -1 },
    {
        name: 'searchByAgentFamilyName',
        partialFilterExpression: {
            'agent.familyName': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.givenName': 1, startDate: -1 },
    {
        name: 'searchByAgentGivenName',
        partialFilterExpression: {
            'agent.givenName': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.email': 1, startDate: -1 },
    {
        name: 'searchByAgentEmail',
        partialFilterExpression: {
            'agent.email': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.telephone': 1, startDate: -1 },
    {
        name: 'searchByAgentTelephone',
        partialFilterExpression: {
            'agent.telephone': { $exists: true }
        }
    }
);
schema.index(
    { 'seller.typeOf': 1, startDate: -1 },
    {
        name: 'searchBySellerTypeOf',
        partialFilterExpression: {
            'seller.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'seller.id': 1, startDate: -1 },
    {
        name: 'searchBySellerId',
        partialFilterExpression: {
            'seller.id': { $exists: true }
        }
    }
);

// タスクエクスポート時の検索で使用
schema.index(
    { tasksExportationStatus: 1, status: 1 }
);
schema.index(
    { tasksExportationStatus: 1, status: 1, typeOf: 1 }
);

// 取引期限切れ確認等に使用
schema.index(
    { status: 1, expires: 1 }
);

// 実行中タスクエクスポート監視に使用
schema.index(
    { tasksExportationStatus: 1, updatedAt: 1 }
);

// 取引進行中は、基本的にIDとステータスで参照する
schema.index(
    { status: 1, typeOf: 1, _id: 1 }
);

// 許可証でユニークに
schema.index(
    {
        'object.passportToken': 1
    },
    {
        unique: true,
        partialFilterExpression: {
            'object.passportToken': { $exists: true }
        }
    }
);

// 結果の注文番号はユニークなはず
schema.index(
    {
        'result.order.orderNumber': 1
    },
    {
        unique: true,
        partialFilterExpression: {
            'result.order.orderNumber': { $exists: true }
        }
    }
);

schema.index(
    {
        typeOf: 1,
        'result.order.orderNumber': 1
    },
    {
        partialFilterExpression: {
            'result.order.orderNumber': { $exists: true }
        }
    }
);

// レポート作成時に使用
schema.index(
    { 'seller.id': 1, startDate: 1, endDate: 1 },
    {
        partialFilterExpression: {
            'seller.id': { $exists: true },
            endDate: { $exists: true }
        }
    }
);
schema.index(
    { status: 1, 'seller.id': 1, startDate: 1 }
);
schema.index(
    { status: 1, 'seller.id': 1, endDate: 1 },
    {
        partialFilterExpression: {
            'seller.id': { $exists: true },
            endDate: { $exists: true }
        }
    }
);

// ひとつの注文取引に対する返品取引はユニークなはず
schema.index(
    {
        'object.transaction.id': 1
    },
    {
        unique: true,
        partialFilterExpression: {
            typeOf: factory.transactionType.ReturnOrder,
            'object.transaction.id': { $exists: true }
        }
    }
);

schema.index(
    { 'result.eventReservations.payment_no': 1, startDate: -1 },
    {
        name: 'searchByResultEventReservationsPaymentNo',
        partialFilterExpression: {
            'result.eventReservations.payment_no': { $exists: true }
        }
    }
);

schema.index(
    { 'result.eventReservations.performance_day': 1, startDate: -1 },
    {
        name: 'searchByResultEventReservationsPerformanceDay',
        partialFilterExpression: {
            'result.eventReservations.performance_day': { $exists: true }
        }
    }
);

// backendでのレポートダウンロード時に使用
schema.index(
    {
        typeOf: 1,
        status: 1,
        'object.purchaser_group': 1,
        endDate: 1
    },
    {
        name: 'downloadSalesReport',
        partialFilterExpression: {
            endDate: { $exists: true }
        }
    }
);
schema.index(
    {
        typeOf: 1,
        status: 1,
        'object.purchaser_group': 1,
        'result.eventReservations.owner_username': 1,
        endDate: 1
    },
    {
        name: 'downloadSalesReportByStaff',
        partialFilterExpression: {
            endDate: { $exists: true },
            'result.eventReservations.owner_username': { $exists: true }
        }
    }
);
schema.index(
    {
        typeOf: 1,
        status: 1,
        'object.purchaser_group': 1,
        startDate: 1,
        endDate: 1
    },
    {
        name: 'searchPlaceOrder4report',
        partialFilterExpression: {
            'object.purchaser_group': { $exists: true },
            endDate: { $exists: true }
        }
    }
);
schema.index(
    {
        typeOf: 1,
        status: 1,
        'object.transaction.object.purchaser_group': 1,
        startDate: 1,
        endDate: 1
    },
    {
        name: 'searchReturnOrder4report',
        partialFilterExpression: {
            'object.transaction.object.purchaser_group': { $exists: true },
            endDate: { $exists: true }
        }
    }
);
schema.index(
    {
        typeOf: 1,
        status: 1,
        'object.purchaser_group': 1,
        'result.eventReservations.performance_start_date': 1
    },
    {
        name: 'searchPlaceOrder4reportByEventStartDate',
        partialFilterExpression: {
            'object.purchaser_group': { $exists: true },
            'result.eventReservations.performance_start_date': { $exists: true }
        }
    }
);
schema.index(
    {
        typeOf: 1,
        status: 1,
        'object.transaction.object.purchaser_group': 1,
        'object.transaction.result.eventReservations.performance_start_date': 1
    },
    {
        name: 'searchReturnOrder4reportByEventStartDate',
        partialFilterExpression: {
            'object.transaction.object.purchaser_group': { $exists: true },
            'result.eventReservations.performance_start_date': { $exists: true }
        }
    }
);
schema.index(
    {
        'result.eventReservations.performance_start_date': 1
    },
    {
        name: 'searchPlaceOrderByEventStartDate',
        partialFilterExpression: {
            'result.eventReservations.performance_start_date': { $exists: true }
        }
    }
);
schema.index(
    {
        'object.transaction.result.eventReservations.performance_start_date': 1
    },
    {
        name: 'searchReturnOrderByEventStartDate',
        partialFilterExpression: {
            'object.transaction.result.eventReservations.performance_start_date': { $exists: true }
        }
    }
);
schema.index(
    {
        'object.purchaser_group': 1
    },
    {
        name: 'searchPlaceOrderByPurchaserGroup',
        partialFilterExpression: {
            'object.purchaser_group': { $exists: true }
        }
    }
);
schema.index(
    {
        'object.transaction.object.purchaser_group': 1
    },
    {
        name: 'searchReturnOrderByPurchaserGroup',
        partialFilterExpression: {
            'object.transaction.object.purchaser_group': { $exists: true }
        }
    }
);

export default mongoose.model('Transaction', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    });
