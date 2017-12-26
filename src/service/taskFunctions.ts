/**
 * タスクファンクションサービス
 * タスク名ごとに、実行するファンクションをひとつずつ定義しています
 * @namespace service.taskFunctions
 */

import * as mongoose from 'mongoose';
import * as redis from 'redis';

import * as factory from '@motionpicture/ttts-factory';

import { MongoRepository as SeatReservationAuthorizeActionRepo } from '../repo/action/authorize/seatReservation';
import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { RedisRepository as TicketTypeCategoryRateLimitRepo } from '../repo/rateLimit/ticketTypeCategory';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as StockRepo } from '../repo/stock';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

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
    return async () => {
        await SalesService.cancelCreditCardAuth(data.transactionId);
    };
}

export function settleSeatReservation(
    data: factory.task.settleSeatReservation.IData
): IOperation<void> {
    return async () => {
        await StockService.transferSeatReservation(data.transactionId);
    };
}

export function settleCreditCard(
    data: factory.task.settleCreditCard.IData
): IOperation<void> {
    return async () => {
        await SalesService.settleCreditCardAuth(data.transactionId);
    };
}

export function returnOrder(
    data: factory.task.returnOrder.IData
): IOperation<void> {
    return async (connection: mongoose.Connection, redisClient: redis.RedisClient) => {
        const performanceRepo = new PerformanceRepo(connection);
        const reservationRepo = new ReservationRepo(connection);
        const stockRepo = new StockRepo(connection);
        const transactionRepo = new TransactionRepo(connection);
        const ticketTypeCategoryRateLimitRepo = new TicketTypeCategoryRateLimitRepo(redisClient);
        await OrderService.processReturn(data.transactionId)(
            performanceRepo, reservationRepo, stockRepo, transactionRepo, ticketTypeCategoryRateLimitRepo
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
