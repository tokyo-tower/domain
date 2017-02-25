// tslint:disable-next-line:missing-jsdoc
import { PerformanceStatusesModel } from '../lib/index';

describe('performance statuses', () => {
    it('find ok', (done) => {
        PerformanceStatusesModel.find((err) => {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });
});
