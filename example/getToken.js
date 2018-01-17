/**
 * APIのアクセストークン取得サンプル
 */

const ttts = require('../');

ttts.CommonUtil.getToken({
    authorizeServerDomain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
}).then((credentials) => {
    console.log(credentials);
});;
