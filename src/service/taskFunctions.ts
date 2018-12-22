/**
 * タスクファンクションサービス
 * タスク名ごとに、実行するファンクションをひとつずつ定義しています
 */
import * as factory from '@motionpicture/ttts-factory';
import * as mongoose from 'mongoose';
import * as redis from 'redis';

import { MongoRepository as CreditCardAuthorizeActionRepo } from '../repo/action/authorize/creditCard';
import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../repo/action/authorize/seatReservation';
import { MongoRepository as AggregateSaleRepo } from '../repo/aggregateSale';
import { MongoRepository as OrderRepo } from '../repo/order';
import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as AggregateService from '../service/aggregate';
import * as NotificationService from '../service/notification';
import * as OrderService from '../service/order';
import * as SalesService from '../service/sales';
import * as StockService from '../service/stock';

export type IOperation<T> = (connection: mongoose.Connection, redisClient: redis.RedisClient) => Promise<T>;

export function sendEmailNotification(
    data: factory.task.sendEmailNotification.IData
): IOperation<void> {
    return async (__: mongoose.Connection) => {
        await NotificationService.sendEmail(data.emailMessage)();
    };
}

export function triggerWebhook(data: factory.task.triggerWebhook.IData): IOperation<void> {
    return async (_: mongoose.Connection) => {
        await NotificationService.triggerWebhook(data)();
    };
}

export function cancelSeatReservation(
    data: factory.task.cancelSeatReservation.IData
): IOperation<void> {
    return async (connection: mongoose.Connection, redisClient: redis.RedisClient) => {
        const seatReservationAuthorizeActionRepo = new SeatReservationAuthorizeActionRepo(connection);
        const stockRepo = new StockRepo(connection);
        const ticketTypeCategoryRateLimitRepo = new TicketTypeCategoryRateLimitRepo(redisClient);
        await StockService.cancelSeatReservationAuth(data.transactionId)(
            seatReservationAuthorizeActionRepo, stockRepo, ticketTypeCategoryRateLimitRepo
        );
    };
}

export function cancelCreditCard(
    data: factory.task.cancelCreditCard.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        await SalesService.cancelCreditCardAuth(data.transactionId)(
            new CreditCardAuthorizeActionRepo(connection)
        );
    };
}

export function settleSeatReservation(
    data: factory.task.settleSeatReservation.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        await StockService.transferSeatReservation(data.transactionId)(
            new TransactionRepo(connection),
            new ReservationRepo(connection)
        );
    };
}

export function settleCreditCard(
    data: factory.task.settleCreditCard.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        await SalesService.settleCreditCardAuth(data.transactionId)(
            new TransactionRepo(connection)
        );
    };
}

export function createOrder(
    data: factory.task.createOrder.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        const orderRepo = new OrderRepo(connection);
        const transactionRepo = new TransactionRepo(connection);
        await OrderService.createFromTransaction(data.transactionId)(orderRepo, transactionRepo);
    };
}

export function returnOrder(
    data: factory.task.returnOrder.IData
): IOperation<void> {
    return async (connection: mongoose.Connection, redisClient: redis.RedisClient) => {
        await OrderService.processReturn(data.transactionId)(
            new PerformanceRepo(connection),
            new ReservationRepo(connection),
            new StockRepo(connection),
            new TransactionRepo(connection),
            new TicketTypeCategoryRateLimitRepo(redisClient),
            new TaskRepo(connection),
            new OrderRepo(connection)
        );
    };
}

export function returnOrdersByPerformance(
    data: factory.task.returnOrdersByPerformance.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        const performanceRepo = new PerformanceRepo(connection);
        const reservationRepo = new ReservationRepo(connection);
        const transactionRepo = new TransactionRepo(connection);

        await OrderService.processReturnAllByPerformance(data.agentId, data.performanceId)(
            performanceRepo, reservationRepo, transactionRepo
        );
    };
}

export function createPlaceOrderReport(
    data: factory.task.createPlaceOrderReport.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        const aggregateSaleRepo = new AggregateSaleRepo(connection);
        await AggregateService.report4sales.createPlaceOrderReport(data)(aggregateSaleRepo);
    };
}

export function createReturnOrderReport(
    data: factory.task.createReturnOrderReport.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        const aggregateSaleRepo = new AggregateSaleRepo(connection);
        await AggregateService.report4sales.createReturnOrderReport(data)(aggregateSaleRepo);
    };
}

export function updateOrderReportByReservation(
    data: factory.task.updateOrderReportByReservation.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        const aggregateSaleRepo = new AggregateSaleRepo(connection);
        await AggregateService.report4sales.updateOrderReportByReservation(data)(aggregateSaleRepo);
    };
}
