/**
 * 管理者サービス
 * 管理ユーザーをAmazon Cognitoで管理しているので、基本的にCognitoとの連携を担うサービス
 */
// import * as factory from '@tokyotower/factory';
import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';
import * as createDebug from 'debug';

const debug = createDebug('ttts-domain:service');
const REGION = 'ap-northeast-1';

type CognitoUserAttributeType = AWS.CognitoIdentityServiceProvider.AttributeType;

export interface ICredentials {
    accessToken: string;
    expiresIn: number;
    idToken: string;
    refreshToken: string;
    tokenType: string;
}

export interface IAdmin {
    username: string;
    familyName: string;
    givenName: string;
    email: string;
    telephone: string;
}

export type ILoginOperation<T> = () => Promise<T>;

/**
 * 管理者としてログインする
 * @param username ユーザーネーム
 * @param password パスワード
 */
export function login(
    accessKeyId: string,
    secretAccessKey: string,
    clientId: string,
    clientSecret: string,
    userPoolId: string,
    username: string,
    password: string
): ILoginOperation<ICredentials> {
    return async () => {
        return new Promise<ICredentials>((resolve, reject) => {
            const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({
                apiVersion: 'latest',
                region: REGION,
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            });
            const hash = crypto.createHmac('sha256', clientSecret)
                .update(`${username}${clientId}`)
                .digest('base64');
            const params = {
                UserPoolId: userPoolId,
                ClientId: clientId,
                AuthFlow: 'ADMIN_NO_SRP_AUTH',
                AuthParameters: {
                    USERNAME: username,
                    SECRET_HASH: hash,
                    PASSWORD: password
                }
                // ClientMetadata?: ClientMetadataType;
                // AnalyticsMetadata?: AnalyticsMetadataType;
                // ContextData?: ContextDataType;
            };

            cognitoidentityserviceprovider.adminInitiateAuth(params, (err, data) => {
                debug('adminInitiateAuth result:', err, data);
                if (err instanceof Error) {
                    reject(err);
                } else {
                    if (data.AuthenticationResult === undefined) {
                        reject(new Error('Unexpected.'));
                    } else {
                        resolve({
                            accessToken: <string>data.AuthenticationResult.AccessToken,
                            expiresIn: <number>data.AuthenticationResult.ExpiresIn,
                            idToken: <string>data.AuthenticationResult.IdToken,
                            refreshToken: <string>data.AuthenticationResult.RefreshToken,
                            tokenType: <string>data.AuthenticationResult.TokenType
                        });
                    }
                }
            });
        });
    };
}

/**
 * アクセストークンからユーザー情報を取得する
 * @param accesssToken アクセストークン
 */
export function getUserByAccessToken(accesssToken: string) {
    return async () => {
        return new Promise<IAdmin>((resolve, reject) => {
            const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
                apiVersion: 'latest',
                region: REGION
            });

            cognitoIdentityServiceProvider.getUser(
                {
                    AccessToken: accesssToken
                },
                (err, data) => {
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        const userAttributes = data.UserAttributes;
                        resolve({
                            username: data.Username,
                            // id: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'sub')).Value,
                            familyName: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'family_name')).Value,
                            givenName: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'given_name')).Value,
                            email: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'email')).Value,
                            telephone: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'phone_number')).Value
                        });
                    }
                });
        });
    };
}

/**
 * 全ユーザーを検索する
 * @param accessKeyId AWSアクセスキー
 * @param secretAccessKey AWSアクセスシークレット
 * @param userPoolId CognitoyユーザープールID
 */
export function findAll(
    accessKeyId: string,
    secretAccessKey: string,
    userPoolId: string
) {
    return async () => {
        return new Promise<IAdmin[]>((resolve, reject) => {
            const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
                apiVersion: 'latest',
                region: REGION,
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            });

            cognitoIdentityServiceProvider.listUsers(
                {
                    UserPoolId: userPoolId,
                    //    AttributesToGet?: SearchedAttributeNamesListType;
                    //    Limit?: QueryLimitType;
                    //    PaginationToken?: SearchPaginationTokenType;
                    Filter: 'cognito:user_status = "CONFIRMED"'
                },
                (err, data) => {
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        if (data.Users === undefined) {
                            reject(new Error('Unexpected.'));
                        } else {
                            const admins = data.Users.map((user) => {
                                const userAttributes = <AWS.CognitoIdentityServiceProvider.AttributeType[]>user.Attributes;

                                return {
                                    username: <string>user.Username,
                                    // tslint:disable-next-line:max-line-length
                                    familyName: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'family_name')).Value,
                                    // tslint:disable-next-line:max-line-length
                                    givenName: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'given_name')).Value,
                                    email: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'email')).Value,
                                    // tslint:disable-next-line:max-line-length
                                    telephone: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'phone_number')).Value
                                };
                            });

                            resolve(admins);
                        }
                    }
                });
        });
    };
}

/**
 * グループに所属する全ユーザーを検索する
 * @param accessKeyId AWSアクセスキー
 * @param secretAccessKey AWSアクセスシークレット
 * @param userPoolId CognitoyユーザープールID
 * @param groupName グループ名
 */
export function findAllByGroup(
    accessKeyId: string,
    secretAccessKey: string,
    userPoolId: string,
    groupName: string
) {
    return async () => {
        return new Promise<IAdmin[]>((resolve, reject) => {
            const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
                apiVersion: 'latest',
                region: REGION,
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            });

            cognitoIdentityServiceProvider.listUsersInGroup(
                {
                    GroupName: groupName,
                    UserPoolId: userPoolId
                },
                (err, data) => {
                    debug('listUsersInGroup result:', err, data);
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        if (data.Users === undefined) {
                            reject(new Error('Unexpected.'));
                        } else {
                            const admins = data.Users.map((user) => {
                                const userAttributes = <AWS.CognitoIdentityServiceProvider.AttributeType[]>user.Attributes;

                                return {
                                    username: <string>user.Username,
                                    // tslint:disable-next-line:max-line-length
                                    familyName: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'family_name')).Value,
                                    // tslint:disable-next-line:max-line-length
                                    givenName: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'given_name')).Value,
                                    email: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'email')).Value,
                                    // tslint:disable-next-line:max-line-length
                                    telephone: <string>(<CognitoUserAttributeType>userAttributes.find((a) => a.Name === 'phone_number')).Value
                                };
                            });

                            resolve(admins);
                        }
                    }
                });
        });
    };
}

export interface IGroup {
    name: string;
    description: string;
}

/**
 * ユーザーネームからグループを取得する
 * @param accessKeyId AWSアクセスキー
 * @param secretAccessKey AWSアクセスシークレット
 * @param userPoolId CognitoyユーザープールID
 * @param username ユーザーネーム
 */
export function getGroupsByUsername(
    accessKeyId: string,
    secretAccessKey: string,
    userPoolId: string,
    username: string
) {
    return async () => {
        return new Promise<IGroup[]>((resolve, reject) => {
            const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
                apiVersion: 'latest',
                region: REGION,
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            });

            cognitoIdentityServiceProvider.adminListGroupsForUser(
                {
                    Username: username,
                    UserPoolId: userPoolId
                },
                (err, data2) => {
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        if (!Array.isArray(data2.Groups)) {
                            reject(new Error('Unexpected.'));
                        } else {
                            resolve(
                                data2.Groups.map((g) => {
                                    return {
                                        name: <string>g.GroupName,
                                        description: <string>g.Description
                                    };
                                })
                            );
                        }
                    }
                }
            );

        });
    };
}
