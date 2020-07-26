/**
 * 外部サービスを使用するための認証情報
 */
export const credentials = {
    cinerino: {
        authorizeServerDomain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
        clientId: <string>process.env.CINERINO_CLIENT_ID,
        clientSecret: <string>process.env.CINERINO_CLIENT_SECRET
    },
    lineNotify: {
        url: <string>process.env.LINE_NOTIFY_URL,
        accessToken: <string>process.env.LINE_NOTIFY_ACCESS_TOKEN
    },
    sendGrid: {
        apiKey: <string>process.env.SENDGRID_API_KEY
    }
};
