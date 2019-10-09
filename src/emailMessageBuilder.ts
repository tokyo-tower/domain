/**
 * Eメールメッセージビルダー
 */
import * as factory from '@tokyotower/factory';
// import * as moment from 'moment-timezone';
import * as pug from 'pug';
import * as util from 'util';

const templateDirectory = `${__dirname}/../emails`;

/**
 * 返金メッセージを作成する
 */
export async function createRefundMessage(params: {
    order: factory.order.IOrder;
    paymentMethods: factory.order.IPaymentMethod<factory.paymentMethodType>[];
    email?: factory.creativeWork.message.email.ICustomization;
}): Promise<factory.creativeWork.message.email.ICreativeWork> {
    // tslint:disable-next-line:max-func-body-length
    return new Promise<factory.creativeWork.message.email.ICreativeWork>(async (resolve, reject) => {
        // テンプレートからEメールメッセージを作成
        const emailTemplate = (params.email !== undefined) ? params.email.template : undefined;
        let emailMessageText: string;
        if (emailTemplate !== undefined) {
            emailMessageText = await new Promise<string>((resolveRender) => {
                pug.render(
                    emailTemplate,
                    {
                        order: params.order
                    },
                    (renderMessageErr, message) => {
                        if (renderMessageErr instanceof Error) {
                            reject(new factory.errors.Argument('emailTemplate', renderMessageErr.message));

                            return;
                        }

                        resolveRender(message);
                    }
                );
            });
        } else {
            emailMessageText = await new Promise<string>((resolveRender) => {
                pug.renderFile(
                    `${templateDirectory}/refundOrder/text.pug`,
                    {
                        order: params.order,
                        paymentMethods: params.paymentMethods.map((p) => {
                            return util.format(
                                '%s\n%s\n%s\n',
                                p.typeOf,
                                (p.accountId !== undefined) ? p.accountId : '',
                                (p.totalPaymentDue !== undefined) ? `${p.totalPaymentDue.value} ${p.totalPaymentDue.currency}` : ''
                            );
                        })
                            .join('\n')
                    },
                    (renderMessageErr, message) => {
                        if (renderMessageErr instanceof Error) {
                            reject(renderMessageErr);

                            return;
                        }

                        resolveRender(message);
                    }
                );
            });
        }

        pug.renderFile(
            `${templateDirectory}/refundOrder/subject.pug`,
            {
                sellerName: params.order.seller.name
            },
            (renderSubjectErr, defaultSubject) => {
                if (renderSubjectErr instanceof Error) {
                    reject(renderSubjectErr);

                    return;
                }

                const defaultToRecipientEmail = params.order.customer.email;
                if (defaultToRecipientEmail === undefined) {
                    reject(new factory.errors.Argument('order', 'order.customer.email undefined'));

                    return;
                }

                const sender: factory.creativeWork.message.email.IParticipant = {
                    typeOf: params.order.seller.typeOf,
                    name: (params.email !== undefined
                        && params.email.sender !== undefined
                        && typeof params.email.sender.name === 'string')
                        ? params.email.sender.name
                        : params.order.seller.name,
                    email: (params.email !== undefined
                        && params.email.sender !== undefined
                        && typeof params.email.sender.email === 'string')
                        ? params.email.sender.email
                        : 'noreply@example.com'
                };

                const toRecipient: factory.creativeWork.message.email.IParticipant = {
                    typeOf: params.order.customer.typeOf,
                    name: (params.email !== undefined
                        && params.email.toRecipient !== undefined
                        && typeof params.email.toRecipient.name === 'string')
                        ? params.email.toRecipient.name
                        : `${params.order.customer.familyName} ${params.order.customer.givenName}`,
                    email: (params.email !== undefined
                        && params.email.toRecipient !== undefined
                        && typeof params.email.toRecipient.email === 'string')
                        ? params.email.toRecipient.email
                        : defaultToRecipientEmail
                };

                const about: string = (params.email !== undefined
                    && typeof params.email.about === 'string')
                    ? params.email.about
                    : defaultSubject;

                const email: factory.creativeWork.message.email.ICreativeWork = {
                    typeOf: factory.creativeWorkType.EmailMessage,
                    identifier: `RefundOrder-${params.order.orderNumber}`,
                    name: `RefundOrder-${params.order.orderNumber}`,
                    sender: sender,
                    toRecipient: toRecipient,
                    about: about,
                    text: emailMessageText
                };

                resolve(email);
            }
        );
    });
}
