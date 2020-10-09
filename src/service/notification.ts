/**
 * 通知サービス
 */
import * as createDebug from 'debug';
import { OK } from 'http-status';
import * as request from 'request';

import { credentials } from '../credentials';

export type Operation<T> = () => Promise<T>;

const debug = createDebug('cinerino-domain:service');

// tslint:disable-next-line:no-magic-numbers
const TRIGGER_WEBHOOK_TIMEOUT = (process.env.TRIGGER_WEBHOOK_TIMEOUT !== undefined) ? Number(process.env.TRIGGER_WEBHOOK_TIMEOUT) : 15000;

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
