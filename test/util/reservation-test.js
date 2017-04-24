"use strict";
/**
 * 予約ユーティリティテスト
 *
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const moment = require("moment");
const sequence_1 = require("../../lib/model/mongoose/sequence");
const ReservationUtil = require("../../lib/util/reservation");
describe('予約ユーティリティ 購入管理番号生成', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        const date = moment().format('YYYYMMDD');
        // 最新の連番取得
        const paymentNo1 = yield ReservationUtil.publishPaymentNo();
        assert(ReservationUtil.isValidPaymentNo(paymentNo1));
        const sequenceDoc1 = yield sequence_1.default.findOne({
            target: ReservationUtil.SEQUENCE_TARGET,
            date: date
        }).exec();
        // 購入番号生成
        const paymentNo2 = yield ReservationUtil.publishPaymentNo();
        assert(ReservationUtil.isValidPaymentNo(paymentNo2));
        // 番号をデコードして連番取得
        const no2 = ReservationUtil.decodePaymentNo(paymentNo2);
        // 連番が+1かどうか
        assert.equal(no2, sequenceDoc1.get('no') + 1);
        // 連番のデータが確かにあるかどうか
        const sequenceDoc2 = yield sequence_1.default.findOne({
            target: ReservationUtil.SEQUENCE_TARGET,
            date: date
        }).exec();
        assert.equal(no2, sequenceDoc2.get('no'));
    }));
});
