// tslint:disable:max-classes-per-file
/**
 * リポジトリ
 */
import { MongoRepository as PerformanceRepo } from './repo/performance';
import { MongoRepository as ReportRepo } from './repo/report';

/**
 * パフォーマンスリポジトリ
 */
export class Performance extends PerformanceRepo { }

/**
 * レポートリポジトリ
 */
export class Report extends ReportRepo { }
