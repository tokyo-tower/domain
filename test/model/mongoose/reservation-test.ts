/**
 * 予約スキーマテスト
 */

import * as assert from 'assert';

import Reservation from '../../../lib/model/mongoose/reservation';
import * as ReservationUtil from '../../../lib/util/reservation';

describe('予約スキーマ 初期値', () => {
    before(async () => {
        // 予約全削除
        await Reservation.remove({}).exec();
    });

    it('入場履歴の初期値は空配列', async () => {
        // 入場履歴がundefinedなテストデータ作成
        const reservation = {
            performance: 'xxx',
            seat_code: 'xxx',
            status: ReservationUtil.STATUS_TEMPORARY
        };
        const reservationDoc = await Reservation.create(reservation);

        // 入場履歴が空配列かどうか確認
        assert(Array.isArray(reservationDoc.get('checkins')));
        assert((<any[]>reservationDoc.get('checkins')).length === 0);

        // テストデータ削除
        await reservationDoc.remove();
    });
});

describe('予約スキーマ virtual', () => {
    before(async () => {
        // 予約全削除
        await Reservation.remove({}).exec();
    });

    it('入場済みかどうか', async () => {
        // 入場履歴がある、なしなテストデータ作成
        const reservation2 = {
            performance: 'xxx1',
            seat_code: 'xxx',
            status: ReservationUtil.STATUS_RESERVED,
            checkins: [{
                when: new Date()
            }]
        };
        const reservation = {
            performance: 'xxx2',
            seat_code: 'xxx',
            status: ReservationUtil.STATUS_RESERVED
        };

        const reservationDoc = await Reservation.create(reservation);
        const reservation2Doc = await Reservation.create(reservation2);

        // 入場履歴が空配列かどうか確認
        assert(reservationDoc.get('checked_in') === false);
        assert(reservation2Doc.get('checked_in') === true);

        // テストデータ削除
        await reservationDoc.remove();
        await reservation2Doc.remove();
    });
});

describe('予約スキーマ static', () => {
    it('QR文字列を正しく分割(any変換)できるかどうか', async () => {
        const day: string = '20170728';
        const paymentNo: string = '1234567';
        const seatIndex: string = '0';
        // 引数セット(QR文字列)
        const qrStr: string = `${day}-${paymentNo}-${seatIndex}`;
        // 期待される返り値セット
        const qrSample: any = {
            performance_day: day,
            payment_no: paymentNo,
            payment_seat_index: seatIndex
        };
        // テスト対象ファンクション実行
        const qrResult: any = (<any>Reservation).parse_from_qr_str(qrStr);
        // 取得したQRクラスが正しいかどうか確認
        assert.deepEqual(qrSample, qrResult);
    });
});
