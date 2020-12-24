// tslint:disable:max-classes-per-file
/**
 * リポジトリ
 */
import { MongoRepository as PerformanceRepo } from './repo/performance';
import { MongoRepository as ReportRepo } from './repo/report';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as TaskRepo } from './repo/task';

/**
 * パフォーマンスリポジトリ
 */
export class Performance extends PerformanceRepo { }

/**
 * レポートリポジトリ
 */
export class Report extends ReportRepo { }

/**
 * 予約リポジトリ
 */
export class Reservation extends ReservationRepo { }

/**
 * タスクリポジトリ
 */
export class Task extends TaskRepo { }
