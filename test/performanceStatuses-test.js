"use strict";
// tslint:disable-next-line:missing-jsdoc
const ttts_domain_1 = require("../lib/ttts-domain");
describe('performance statuses', () => {
    it('find ok', (done) => {
        ttts_domain_1.PerformanceStatusesModel.find((err) => {
            if (err) {
                done(err);
            }
            else {
                done();
            }
        });
    });
});
