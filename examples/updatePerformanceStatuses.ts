// tslint:disable:missing-jsdoc no-backbone-get-set-outside-model
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_PORT = 6380;
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST = 'devtttsfrontendprototype.redis.cache.windows.net';
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_KEY = 'QLnxXJC0srbSaabgac+4tzlmN6abiNdkNvVco7954xc=';

import * as mongoose from 'mongoose';
import { Models, PerformanceStatusesModel } from '../lib/ttts-domain';

mongoose.connect('mongodb://devtttsmongodbuser:w6Zk6z62z3ZKBZ52Ku7kFstTRGmBfAVjXakKz8i6@ds056789.mlab.com:56789/devtttsmongodb', {});

Models.Performance.find(
    {},
    'day start_time screen'
)
    .populate('screen', 'seats_number')
    .exec((err, performances) => {
        // tslint:disable-next-line:no-console
        console.log('performances found.', err);
        if (err) {
            mongoose.disconnect();
            process.exit(0);
            return;
        }

        const performanceStatusesModel = new PerformanceStatusesModel();

        // tslint:disable-next-line:no-console
        console.log('aggregating...');
        Models.Reservation.aggregate(
            [
                {
                    $group: {
                        _id: '$performance',
                        count: { $sum: 1 }
                    }
                }
            ],
            (aggregateErr, results) => {
                // tslint:disable-next-line:no-console
                console.log('aggregated.', aggregateErr);
                if (aggregateErr) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }

                // パフォーマンスIDごとに
                const reservationNumbers = {};
                const DEFAULT_RADIX = 10;
                for (const result of results) {
                    reservationNumbers[result._id] = parseInt(result.count, DEFAULT_RADIX);
                }

                performances.forEach((performance) => {
                    // パフォーマンスごとに空席ステータスを算出する
                    if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                        reservationNumbers[performance.get('_id').toString()] = 0;
                    }

                    // tslint:disable-next-line:no-string-literal
                    const status = performance['getSeatStatus'](reservationNumbers[performance.get('_id').toString()]);
                    performanceStatusesModel.setStatus(performance._id.toString(), status);
                });

                // tslint:disable-next-line:no-console
                console.log('saving performanceStatusesModel...', performanceStatusesModel);
                performanceStatusesModel.save((saveErr) => {
                    // tslint:disable-next-line:no-console
                    console.log('performanceStatusesModel saved.', saveErr);
                    mongoose.disconnect();
                    process.exit(0);
                });
            }
        );
    });
