/**
 * 通知サービス
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
// tslint:disable-next-line:no-implicit-dependencies no-submodule-imports
import { MailData } from '@sendgrid/helpers/classes/mail';
// tslint:disable-next-line:no-require-imports
import sgMail = require('@sendgrid/mail');
import * as factory from '@tokyotower/factory';
import * as createDebug from 'debug';
import { ACCEPTED, OK } from 'http-status';
import * as request from 'request';
import * as util from 'util';

import { credentials } from '../credentials';

export type Operation<T> = () => Promise<T>;

const debug = createDebug('cinerino-domain:service');

// tslint:disable-next-line:no-magic-numbers
const TRIGGER_WEBHOOK_TIMEOUT = (process.env.TRIGGER_WEBHOOK_TIMEOUT !== undefined) ? Number(process.env.TRIGGER_WEBHOOK_TIMEOUT) : 15000;

export function sendEmailMessage(params: cinerinoapi.factory.action.transfer.send.message.email.IAttributes) {
    return async (__: {}) => {
        try {
            const apiKey = credentials.sendGrid.apiKey;
            if (apiKey === undefined) {
                throw new factory.errors.ServiceUnavailable('API Key not found');
            }

            sgMail.setApiKey(apiKey);
            const emailMessage = params.object;
            const msg: MailData = {
                to: {
                    name: emailMessage.toRecipient.name,
                    email: emailMessage.toRecipient.email
                },
                from: {
                    name: emailMessage.sender.name,
                    email: emailMessage.sender.email
                },
                ...(String(emailMessage.about).length > 0) ? { subject: String(emailMessage.about) } : {},
                ...(String(emailMessage.text).length > 0) ? { text: String(emailMessage.text) } : {},
                // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
                // categories: ['Transactional', 'My category'],
                // 送信予定を追加することもできるが、タスクの実行予定日時でコントロールする想定
                // sendAt: moment(email.send_at).unix(),
                // 追跡用に通知IDをカスタムフィールドとしてセットする
                customArgs: {
                    emailMessage: emailMessage.identifier
                }
            };

            debug('requesting sendgrid api...', msg);
            const response = await sgMail.send(msg);
            debug('email sent. status code:', response[0].statusCode);

            // check the response.
            if (response[0].statusCode !== ACCEPTED) {
                throw new Error(`sendgrid request not accepted. response is ${util.inspect(response)}`);
            }
        } catch (error) {
            throw error;
        }
    };
}

/**
 * 開発者に報告する
 * @see https://notify-bot.line.me/doc/ja/
 */
export function report2developers(subject: string, content: string, imageThumbnail?: string, imageFullsize?: string): Operation<void> {
    return async () => {
        const LINE_NOTIFY_URL = credentials.lineNotify.url;
        const LINE_NOTIFY_ACCESS_TOKEN = credentials.lineNotify.accessToken;
        if (LINE_NOTIFY_URL === undefined) {
            throw new Error('Environment variable LINE_NOTIFY_URL not set');
        }
        if (LINE_NOTIFY_ACCESS_TOKEN === undefined) {
            throw new Error('Environment variable LINE_NOTIFY_ACCESS_TOKEN not set');
        }

        const message = `NODE_ENV[${process.env.NODE_ENV}]
------------------------
${subject}
------------------------
${content}`
            ;

        // LINE通知APIにPOST
        const formData: any = {
            message: message,
            ...(typeof imageThumbnail === 'string') ? { imageThumbnail } : undefined,
            ...(typeof imageFullsize === 'string') ? { imageFullsize } : undefined
        };

        return new Promise<void>((resolve, reject) => {
            request.post(
                {
                    url: LINE_NOTIFY_URL,
                    auth: { bearer: LINE_NOTIFY_ACCESS_TOKEN },
                    form: formData,
                    json: true,
                    timeout: TRIGGER_WEBHOOK_TIMEOUT
                },
                (error, response, body) => {
                    debug('posted to LINE Notify.', error, body);
                    if (error !== null) {
                        reject(error);
                    } else {
                        switch (response.statusCode) {
                            case OK:
                                resolve();
                                break;
                            default:
                                reject(new Error(body.message));
                        }
                    }
                }
            );
        });
    };
}
