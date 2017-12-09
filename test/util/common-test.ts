/**
 * 共通ユーティリティテスト
 *
 * @ignore
 */
import * as assert from 'assert';
import * as CommonUtil from '../../lib/util/common';

describe('共通ユーティリティ 認証トークン取得', () => {
    it('ok', async () => {
        // tslint:disable-next-line:no-http-string
        const apiEndpoint: string = 'http://localhost:3000/';
        //const apiEndpoint: string = <string>process.env.API_ENDPOINT;
        // Token取得
        const response: any = await CommonUtil.getToken(apiEndpoint);
        if (response !== null) {
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(`[access_token]${response.access_token}`));
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(`[token_type]${response.token_type}`));
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(`[expires_in]${response.expires_in}`));
            assert.notEqual('', response.access_token);
        }
    });
});
