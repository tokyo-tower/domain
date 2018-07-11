// tslint:disable:no-implicit-dependencies

/**
 * 管理者サービステスト
 * @ignore
 */

import * as AWS_SDK from 'aws-sdk';
import { } from 'mocha';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as ttts from '../index';

let AWS: any;
let sandbox: sinon.SinonSandbox;

before(() => {
    // tslint:disable-next-line:no-require-imports no-var-requires
    AWS = require('aws-sdk-mock');
    AWS.setSDKInstance(AWS_SDK);
    sandbox = sinon.sandbox.create();
});

describe('AdminService', () => {

    describe('login()', () => {
        afterEach(() => {
            AWS.restore('CognitoIdentityServiceProvider');
            sandbox.restore();
        });

        it('AWS Cognitoでエラーが発生すればエラーとなるはず', async () => {
            const err = new Error();
            const stub = sandbox.stub().yields(err, null);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'adminInitiateAuth',
                stub
            );
            const login = ttts.service.admin.login;
            const promise = await login(
                'accessKeyId',
                'secretAccessKey',
                'clientId',
                'clientSecret',
                'userPoolId',
                'username',
                'password'
            );
            const result = await promise().catch((e) => e);
            assert(result instanceof Error);
        });

        it('AWS Cognitoから不測の結果をもらえればエラーとなるはず', async () => {
            const fakeResult = {  };
            const stub = sandbox.stub().yields(null, fakeResult);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'adminInitiateAuth',
                stub
            );
            const login = ttts.service.admin.login;
            const promise = await login(
                'accessKeyId',
                'secretAccessKey',
                'clientId',
                'clientSecret',
                'userPoolId',
                'username',
                'password'
            );
            const result = await promise().catch((e) => e);
            assert(result instanceof Error);
        });

        it('AWS Cognitoから認証情報をもらえばデータを取得できるはず', async () => {
            const fakeResult = {
                AuthenticationResult: {
                    AccessToken: 'AccessToken',
                    ExpiresIn: 0,
                    IdToken: 'IdToken',
                    RefreshToken: 'RefreshToken',
                    TokenType: 'TokenType'
                }
            };
            const expectedResult = {
                accessToken: 'AccessToken',
                expiresIn: 0,
                idToken: 'IdToken',
                refreshToken: 'RefreshToken',
                tokenType: 'TokenType'
            };
            const stub = sandbox.stub().yields(null, fakeResult);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'adminInitiateAuth',
                stub
            );
            const login = ttts.service.admin.login;
            const promise = await login(
                'accessKeyId',
                'secretAccessKey',
                'clientId',
                'clientSecret',
                'userPoolId',
                'username',
                'password'
            );
            const result = await promise();
            assert.deepEqual(result, expectedResult);
        });
    });

    describe('getUserByAccessToken()', () => {
        afterEach(() => {
            AWS.restore('CognitoIdentityServiceProvider');
            sandbox.restore();
        });

        it('AWS Cognitoでエラーが発生すればエラーとなるはず', async () => {
            const err = new Error();
            const stub = sandbox.stub().yields(err, null);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'getUser',
                stub
            );
            const getUserByAccessToken = ttts.service.admin.getUserByAccessToken;
            const promise = await getUserByAccessToken('accessToken');
            const result = await promise().catch((e) => e);
            assert(result instanceof Error);
        });

        it('AWS Cognitoからユーザ情報をもらえばデータを取得できるはず', async () => {
            const fakeResult = {
                Username: 'Username',
                UserAttributes: {
                    find: sandbox.stub().yields({}).returns({ Value: 'test'})
                }
            };
            const expectedResult = {
                username: 'Username',
                familyName: 'test',
                givenName: 'test',
                email: 'test',
                telephone: 'test'
            };
            const stub = sandbox.stub().yields(null, fakeResult);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'getUser',
                stub
            );
            const getUserByAccessToken = ttts.service.admin.getUserByAccessToken;
            const promise = await getUserByAccessToken('accessToken');
            const result = await promise();
            assert.deepEqual(result, expectedResult);
        });
    });

    describe('findAll()', () => {
        afterEach(() => {
            AWS.restore('CognitoIdentityServiceProvider');
            sandbox.restore();
        });

        it('AWS Cognitoでエラーが発生すればエラーとなるはず', async () => {
            const err = new Error();
            const stub = sandbox.stub().yields(err, null);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'listUsers',
                stub
            );
            const expectedArg = {
                UserPoolId: 'userPoolId',
                Filter: 'cognito:user_status = "CONFIRMED"'
            };
            const getUserByAccessToken = ttts.service.admin.findAll;
            const promise = await getUserByAccessToken('accessKeyId', 'secretAccessKey', 'userPoolId');
            const result = await promise().catch((e) => e);
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert(result instanceof Error);
        });

        it('AWS Cognitoから不測の結果をもらえれば、エラーとなるはず', async () => {
            const fakeResult = {  };
            const stub = sandbox.stub().yields(null, fakeResult);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'listUsers',
                stub
            );
            const expectedArg = {
                UserPoolId: 'userPoolId',
                Filter: 'cognito:user_status = "CONFIRMED"'
            };
            const getUserByAccessToken = ttts.service.admin.findAll;
            const promise = await getUserByAccessToken('accessKeyId', 'secretAccessKey', 'userPoolId');
            const result = await promise().catch((e) => e);
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert(result instanceof Error);
        });

        it('AWS Cognitoから期待される結果をもらえれば、データの配列を取得できるはず', async () => {
            const fakeResult = {
                Users: [ {
                        Username: 'Username',
                        Attributes: {
                            find: sandbox.stub().yields({}).returns({ Value: 'test'})
                        }
                } ]
            };
            const expectedResult = [{
                username: 'Username',
                familyName: 'test',
                givenName: 'test',
                email: 'test',
                telephone: 'test'
            }];
            const stub = sandbox.stub().yields(null, fakeResult);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'listUsers',
                stub
            );
            const expectedArg = {
                UserPoolId: 'userPoolId',
                Filter: 'cognito:user_status = "CONFIRMED"'
            };
            const getUserByAccessToken = ttts.service.admin.findAll;
            const promise = await getUserByAccessToken('accessKeyId', 'secretAccessKey', 'userPoolId');
            const result = await promise();
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert.deepEqual(result, expectedResult);
        });
    });

    describe('findAllByGroup()', () => {
        afterEach(() => {
            AWS.restore('CognitoIdentityServiceProvider');
            sandbox.restore();
        });

        it('AWS Cognitoでエラーが発生すればエラーとなるはず', async () => {
            const err = new Error();
            const stub = sandbox.stub().yields(err, null);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'listUsersInGroup',
                stub
            );
            const expectedArg = {
                GroupName: 'groupName',
                UserPoolId: 'userPoolId'
            };
            const findAllByGroup = ttts.service.admin.findAllByGroup;
            const promise = await findAllByGroup('accessKeyId', 'secretAccessKey', 'userPoolId', 'groupName');
            const result = await promise().catch((e) => e);
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert(result instanceof Error);
        });

        it('AWS Cognitoから不測の結果をもらえれば、エラーとなるはず', async () => {
            const fakeResult = {  };
            const stub = sandbox.stub().yields(null, fakeResult);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'listUsersInGroup',
                stub
            );
            const expectedArg = {
                GroupName: 'groupName',
                UserPoolId: 'userPoolId'
            };
            const findAllByGroup = ttts.service.admin.findAllByGroup;
            const promise = await findAllByGroup('accessKeyId', 'secretAccessKey', 'userPoolId', 'groupName');
            const result = await promise().catch((e) => e);
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert(result instanceof Error);
        });

        it('AWS Cognitoから期待される結果をもらえれば、データの配列を取得できるはず', async () => {
            const fakeResult = {
                Users: [ {
                        Username: 'Username',
                        Attributes: {
                            find: sandbox.stub().yields({}).returns({ Value: 'test'})
                        }
                } ]
            };
            const expectedResult = [{
                username: 'Username',
                familyName: 'test',
                givenName: 'test',
                email: 'test',
                telephone: 'test'
            }];
            const stub = sandbox.stub().yields(null, fakeResult);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'listUsersInGroup',
                stub
            );
            const expectedArg = {
                GroupName: 'groupName',
                UserPoolId: 'userPoolId'
            };
            const findAllByGroup = ttts.service.admin.findAllByGroup;
            const promise = await findAllByGroup('accessKeyId', 'secretAccessKey', 'userPoolId', 'groupName');
            const result = await promise();
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert.deepEqual(result, expectedResult);
        });
    });

    describe('getGroupsByUsername()', () => {
        afterEach(() => {
            AWS.restore('CognitoIdentityServiceProvider');
            sandbox.restore();
        });

        it('AWS Cognitoでエラーが発生すればエラーとなるはず', async () => {
            const err = new Error();
            const stub = sandbox.stub().yields(err, null);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'adminListGroupsForUser',
                stub
            );
            const expectedArg = {
                Username: 'username',
                UserPoolId: 'userPoolId'
            };
            const getGroupsByUsername = ttts.service.admin.getGroupsByUsername;
            const promise = await getGroupsByUsername('accessKeyId', 'secretAccessKey', 'userPoolId', 'username');
            const result = await promise().catch((e) => e);
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert(result instanceof Error);
        });

        it('AWS Cognitoから不測の結果をもらえれば、エラーとなるはず', async () => {
            const fakeGroup = {  };
            const stub = sandbox.stub().yields(null, fakeGroup);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'adminListGroupsForUser',
                stub
            );
            const expectedArg = {
                Username: 'username',
                UserPoolId: 'userPoolId'
            };
            const getGroupsByUsername = ttts.service.admin.getGroupsByUsername;
            const promise = await getGroupsByUsername('accessKeyId', 'secretAccessKey', 'userPoolId', 'username');
            const result = await promise().catch((e) => e);
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert(result instanceof Error);
        });

        it('AWS Cognitoから期待される結果をもらえれば、データの配列を取得できるはず', async () => {
            const fakeGroup = {
                Groups: [ {
                    GroupName: 'GroupName',
                    Description: 'Description'
                } ]
            };
            const expectedResult = [ {
                name: 'GroupName',
                description: 'Description'
            } ];
            const stub = sandbox.stub().yields(null, fakeGroup);
            AWS.mock(
                'CognitoIdentityServiceProvider',
                'adminListGroupsForUser',
                stub
            );
            const expectedArg = {
                Username: 'username',
                UserPoolId: 'userPoolId'
            };
            const getGroupsByUsername = ttts.service.admin.getGroupsByUsername;
            const promise = await getGroupsByUsername('accessKeyId', 'secretAccessKey', 'userPoolId', 'username');
            const result = await promise();
            assert(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], expectedArg);
            assert.deepEqual(result, expectedResult);
        });
    });

});
