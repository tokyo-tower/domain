process.env.PERFORMANCE_STATUS_REDIS_PORT = 6380;
process.env.PERFORMANCE_STATUS_REDIS_HOST = "devtttsfrontendprototype.redis.cache.windows.net";
process.env.PERFORMANCE_STATUS_REDIS_KEY = "QLnxXJC0srbSaabgac+4tzlmN6abiNdkNvVco7954xc=";

import mongoose = require("mongoose");
import Models from "../lib/models/Models";
import PerformanceStatusesModel from "../lib/models/PerformanceStatusesModel";

mongoose.connect("mongodb://devtttsmongodbuser:w6Zk6z62z3ZKBZ52Ku7kFstTRGmBfAVjXakKz8i6@ds056789.mlab.com:56789/devtttsmongodb", {});

Models.Performance.find(
    {},
    'day start_time screen'
)
    .populate('screen', 'seats_number')
    .exec((err, performances) => {
        console.log('performances found.', err);
        if (err) {
            mongoose.disconnect();
            process.exit(0);
            return;
        }


        let performanceStatusesModel = new PerformanceStatusesModel();

        console.log('aggregating...');
        Models.Reservation.aggregate(
            [
                {
                    $group: {
                        _id: "$performance",
                        count: { $sum: 1 }
                    }
                }
            ],
            (err, results) => {
                console.log('aggregated.', err);
                if (err) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }

                // パフォーマンスIDごとに
                let reservationNumbers = {};
                for (let result of results) {
                    reservationNumbers[result._id] = parseInt(result.count);
                }

                performances.forEach((performance) => {
                    // パフォーマンスごとに空席ステータスを算出する
                    if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                        reservationNumbers[performance.get('_id').toString()] = 0;
                    }

                    let status = performance['getSeatStatus'](reservationNumbers[performance.get('_id').toString()]);
                    performanceStatusesModel.setStatus(performance._id.toString(), status);
                });

                console.log('saving performanceStatusesModel...', performanceStatusesModel);
                performanceStatusesModel.save((err) => {
                    console.log('performanceStatusesModel saved.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            }
        );
    });
