"use strict";
// tslint:disable-next-line:missing-jsdoc
const index_1 = require("../lib/index");
describe('performance statuses', () => {
    it('find ok', (done) => {
        index_1.PerformanceStatusesModel.find((err) => {
            if (err) {
                done(err);
            }
            else {
                done();
            }
        });
    });
});
