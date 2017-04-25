// tslint:disable-next-line:missing-jsdoc
import { PerformanceStatusesModel } from '../lib/index';

describe('パフォーマンス空席状況 検索', () => {
    it('ok', async () => {
        await PerformanceStatusesModel.find();
    });
});
