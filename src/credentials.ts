/**
 * 外部サービスを使用するための認証情報
 */
export const credentials = {
    aws: {
        accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
    },
    chevre: {
        authorizeServerDomain: <string>process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
        clientId: <string>process.env.CHEVRE_CLIENT_ID,
        clientSecret: <string>process.env.CHEVRE_CLIENT_SECRET
    },
    lineNotify: {
        url: <string>process.env.LINE_NOTIFY_URL,
        accessToken: <string>process.env.LINE_NOTIFY_ACCESS_TOKEN
    },
    sendGrid: {
        apiKey: <string>process.env.SENDGRID_API_KEY
    }
};
