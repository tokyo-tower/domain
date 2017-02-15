"use strict";
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_PORT = 6380;
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST = 'devtttsfrontendprototype.redis.cache.windows.net';
process.env.TTTS_PERFORMANCE_STATUSES_REDIS_KEY = 'QLnxXJC0srbSaabgac+4tzlmN6abiNdkNvVco7954xc=';
const mongoose = require("mongoose");
const ttts_domain_1 = require("../lib/ttts-domain");
mongoose.connect('mongodb://devtttsmongodbuser:w6Zk6z62z3ZKBZ52Ku7kFstTRGmBfAVjXakKz8i6@ds056789.mlab.com:56789/devtttsmongodb', {});
ttts_domain_1.Models.Performance.find({}, 'day start_time screen')
    .populate('screen', 'seats_number')
    .exec((err, performances) => {
    console.log('performances found.', err);
    if (err) {
        mongoose.disconnect();
        process.exit(0);
        return;
    }
    const performanceStatusesModel = new ttts_domain_1.PerformanceStatusesModel();
    console.log('aggregating...');
    ttts_domain_1.Models.Reservation.aggregate([
        {
            $group: {
                _id: '$performance',
                count: { $sum: 1 }
            }
        }
    ], (aggregateErr, results) => {
        console.log('aggregated.', aggregateErr);
        if (aggregateErr) {
            mongoose.disconnect();
            process.exit(0);
            return;
        }
        const reservationNumbers = {};
        const DEFAULT_RADIX = 10;
        for (const result of results) {
            reservationNumbers[result._id] = parseInt(result.count, DEFAULT_RADIX);
        }
        performances.forEach((performance) => {
            if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                reservationNumbers[performance.get('_id').toString()] = 0;
            }
            const status = performance['getSeatStatus'](reservationNumbers[performance.get('_id').toString()]);
            performanceStatusesModel.setStatus(performance._id.toString(), status);
        });
        console.log('saving performanceStatusesModel...', performanceStatusesModel);
        performanceStatusesModel.save((saveErr) => {
            console.log('performanceStatusesModel saved.', saveErr);
            mongoose.disconnect();
            process.exit(0);
        });
    });
});
