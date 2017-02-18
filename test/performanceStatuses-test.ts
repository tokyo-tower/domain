// tslint:disable-next-line:missing-jsdoc
import { PerformanceStatusesModel } from '../lib/ttts-domain';

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
