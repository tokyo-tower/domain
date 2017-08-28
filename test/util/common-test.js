"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 共通ユーティリティテスト
 *
 * @ignore
 */
const assert = require("assert");
const CommonUtil = require("../../lib/util/common");
describe('共通ユーティリティ 認証トークン取得', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line:no-http-string
        const apiEndpoint = 'http://localhost:3000/';
        //const apiEndpoint: string = <string>process.env.API_ENDPOINT;
        // Token取得
        const response = yield CommonUtil.getToken(apiEndpoint);
        if (response !== null) {
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(`[access_token]${response.access_token}`));
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(`[token_type]${response.token_type}`));
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(`[expires_in]${response.expires_in}`));
            assert.notEqual('', response.access_token);
        }
    }));
});
