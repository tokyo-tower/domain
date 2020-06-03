/**
 * 注文サービス
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as Email from 'email-templates';
// @ts-ignore
import * as difference from 'lodash.difference';
// @ts-ignore
import * as uniq from 'lodash.uniq';
import * as moment from 'moment-timezone';
import * as numeral from 'numeral';

import { MongoRepository as PerformanceRepo } from '../repo/performance';
import { MongoRepository as ReservationRepo } from '../repo/reservation';

import * as factory from '@tokyotower/factory';

export type ICompoundPriceSpecification = factory.chevre.compoundPriceSpecification.IPriceSpecification<any>;

export function processReturnAllByPerformance(
    credentials: {
        /**
         * リフレッシュトークン
         */
        refresh_token?: string;
        /**
         * アクセストークン
         */
        access_token?: string;
    },
    agentId: string,
    performanceId: string,
    clientIds: string[]
) {
    return async (
        performanceRepo: PerformanceRepo,
        reservationRepo: ReservationRepo
    ) => {
        // パフォーマンスに対する取引リストを、予約コレクションから検索する
        const reservations = (clientIds.length > 0)
            ? await reservationRepo.search(
                {
                    typeOf: factory.chevre.reservationType.EventReservation,
                    reservationStatuses: [factory.chevre.reservationStatusType.ReservationConfirmed],
                    reservationFor: { id: performanceId },
                    underName: {
                        identifiers: clientIds.map((clientId) => {
                            return { name: 'clientId', value: clientId };
                        })
                    }
                }
            )
            : [];

        // 入場履歴なしの取引IDを取り出す
        let orderNumbers = reservations.map((r) => {
            let orderNumber: string | undefined;
            if (r.underName !== undefined && Array.isArray(r.underName.identifier)) {
                const orderNumberProperty = r.underName.identifier.find((p) => p.name === 'orderNumber');
                if (orderNumberProperty !== undefined) {
                    orderNumber = orderNumberProperty.value;
                }
            }

            return orderNumber;
        });
        const orderNumbersWithCheckins = reservations.filter((r) => (r.checkins.length > 0))
            .map((r) => {
                let orderNumber: string | undefined;
                if (r.underName !== undefined && Array.isArray(r.underName.identifier)) {
                    const orderNumberProperty = r.underName.identifier.find((p) => p.name === 'orderNumber');
                    if (orderNumberProperty !== undefined) {
                        orderNumber = orderNumberProperty.value;
                    }
                }

                return orderNumber;
            });
        orderNumbers = uniq(difference(orderNumbers, orderNumbersWithCheckins));

        const returningOrderNumbers = <string[]>orderNumbers.filter((orderNumber) => typeof orderNumber === 'string');

        // パフォーマンスに返金対対象数を追加する
        await performanceRepo.updateOne(
            { _id: performanceId },
            {
                'ttts_extension.refunded_count': 0, // 返金済数は最初0
                'ttts_extension.unrefunded_count': returningOrderNumbers.length, // 未返金数をセット
                'ttts_extension.refund_status': factory.performance.RefundStatus.Instructed,
                'ttts_extension.refund_update_at': new Date()
            }
        );

        // 返品取引進行
        await processReturnOrders({
            credentials: credentials,
            agentId: agentId,
            orderNumbers: returningOrderNumbers
        });
    };
}

async function processReturnOrders(params: {
    orderNumbers: string[];
    credentials: {
        refresh_token?: string;
        access_token?: string;
    };
    agentId: string;
}) {
    const authClient = new cinerinoapi.auth.OAuth2({
        domain: <string>process.env.CINERINO_API_AUTHORIZE_DOMAIN
    });
    authClient.setCredentials(params.credentials);

    const orderService = new cinerinoapi.service.Order({
        auth: authClient,
        endpoint: <string>process.env.CINERINO_API_ENDPOINT
    });
    const returnOrderService = new cinerinoapi.service.transaction.ReturnOrder({
        auth: authClient,
        endpoint: <string>process.env.CINERINO_API_ENDPOINT
    });

    const returnableOrders: cinerinoapi.factory.transaction.returnOrder.IReturnableOrder[] = [];
    const returnOrderActions: cinerinoapi.factory.transaction.returnOrder.IReturnOrderActionParams[] = [];

    const searchOrdersResult = await orderService.search({
        limit: 100,
        orderNumbers: params.orderNumbers
    });

    await Promise.all(searchOrdersResult.data.map(async (order) => {
        // 返品メール作成
        const emailCustomization = await createEmailMessage4sellerReason(order);

        const paymentMethods = order.paymentMethods;
        const refundCreditCardActionsParams: cinerinoapi.factory.transaction.returnOrder.IRefundCreditCardParams[] =
            paymentMethods
                .filter((p) => p.typeOf === cinerinoapi.factory.paymentMethodType.CreditCard)
                .map((p) => {
                    return {
                        object: {
                            object: [{
                                paymentMethod: {
                                    paymentMethodId: p.paymentMethodId
                                }
                            }]
                        },
                        potentialActions: {
                            sendEmailMessage: {
                                object: {
                                    sender: emailCustomization.sender,
                                    toRecipient: emailCustomization.toRecipient,
                                    about: emailCustomization.about,
                                    text: emailCustomization.text
                                }
                            }
                        }
                    };
                })
            ;

        returnableOrders.push({ orderNumber: order.orderNumber });
        returnOrderActions.push({
            object: { orderNumber: order.orderNumber },
            potentialActions: {
                refundCreditCard: refundCreditCardActionsParams
            }
        });
    }));

    const returnOrderTransaction = await returnOrderService.start({
        expires: moment()
            .add(1, 'minute')
            .toDate(),
        object: {
            order: returnableOrders
        },
        agent: {
            identifier: [
                { name: 'reason', value: cinerinoapi.factory.transaction.returnOrder.Reason.Seller }
            ],
            ...{
                typeOf: cinerinoapi.factory.personType.Person,
                id: params.agentId
            }
        }
    });
    await returnOrderService.confirm({
        id: returnOrderTransaction.id,
        potentialActions: {
            returnOrder: returnOrderActions
        }
    });
}

function getUnitPriceByAcceptedOffer(offer: cinerinoapi.factory.order.IAcceptedOffer<any>) {
    let unitPrice: number = 0;

    if (offer.priceSpecification !== undefined) {
        const priceSpecification = <ICompoundPriceSpecification>offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceSpec = priceSpecification.priceComponent.find(
                (c) => c.typeOf === factory.chevre.priceSpecificationType.UnitPriceSpecification
            );
            if (unitPriceSpec !== undefined && unitPriceSpec.price !== undefined && Number.isInteger(unitPriceSpec.price)) {
                unitPrice = unitPriceSpec.price;
            }
        }
    } else if (offer.price !== undefined && Number.isInteger(offer.price)) {
        unitPrice = offer.price;
    }

    return unitPrice;
}

/**
 * 販売者都合での返品メール作成
 */
async function createEmailMessage4sellerReason(
    // placeOrderTransaction: cinerinoapi.factory.transaction.placeOrder.ITransaction
    order: cinerinoapi.factory.order.IOrder
): Promise<cinerinoapi.factory.creativeWork.message.email.IAttributes> {
    // const transactionResult = <cinerinoapi.factory.transaction.placeOrder.IResult>placeOrderTransaction.result;
    // const order = transactionResult.order;
    const reservation = <cinerinoapi.factory.order.IReservation>order.acceptedOffers[0].itemOffered;

    const email = new Email({
        views: { root: `${__dirname}/../../emails` },
        message: {},
        // uncomment below to send emails in development/test env:
        // send: true
        transport: {
            jsonTransport: true
        }
        // htmlToText: false
    });

    // 券種ごとに合計枚数算出
    const ticketInfos: {
        [ticketTypeId: string]: {
            name: {
                ja?: string;
                en?: string;
            };
            charge: string;
            count: number;
        };
    } = {};
    order.acceptedOffers.forEach((o) => {
        const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;
        const unitPrice = getUnitPriceByAcceptedOffer(o);

        // チケットタイプごとにチケット情報セット
        if (ticketInfos[<string>r.reservedTicket.ticketType.id] === undefined) {
            ticketInfos[<string>r.reservedTicket.ticketType.id] = {
                name: <cinerinoapi.factory.chevre.multilingualString>r.reservedTicket.ticketType.name,
                charge: `\\${numeral(unitPrice).format('0,0')}`,
                count: 0
            };
        }

        ticketInfos[<string>r.reservedTicket.ticketType.id].count += 1;
    });
    // 券種ごとの表示情報編集 (sort順を変えないよう同期Loop:"for of")
    const ticketInfoJa = Object.keys(ticketInfos).map((ticketTypeId) => {
        const ticketInfo = ticketInfos[ticketTypeId];

        return `${ticketInfo.name.ja} ${ticketInfo.charge} × ${ticketInfo.count}枚`;
    }).join('\n');
    const ticketInfoEn = Object.keys(ticketInfos).map((ticketTypeId) => {
        const ticketInfo = ticketInfos[ticketTypeId];

        return `${ticketInfo.name.en} ${ticketInfo.charge} × ${ticketInfo.count} ticket(s)`;
    }).join('\n');

    let paymentNo = '';
    if (Array.isArray(order.identifier)) {
        const confirmationNumberProperty = order.identifier.find((p: any) => p.name === 'confirmationNumber');
        if (confirmationNumberProperty !== undefined) {
            // tslint:disable-next-line:no-magic-numbers
            paymentNo = confirmationNumberProperty.value.slice(-6);
        }
    }

    const message = await email.render('returnOrderBySeller', {
        purchaserNameJa: `${order.customer.familyName} ${order.customer.givenName}`,
        purchaserNameEn: order.customer.name,
        paymentNo: paymentNo,
        day: moment(reservation.reservationFor.startDate).tz('Asia/Tokyo').format('YYYY/MM/DD'),
        startTime: moment(reservation.reservationFor.startDate).tz('Asia/Tokyo').format('HH:mm'),
        amount: numeral(order.price).format('0,0'),
        numberOfReservations: order.acceptedOffers.length,
        ticketInfoJa,
        ticketInfoEn
    });

    return {
        typeOf: cinerinoapi.factory.creativeWorkType.EmailMessage,
        sender: {
            typeOf: cinerinoapi.factory.organizationType.Corporation,
            name: 'Tokyo Tower TOP DECK TOUR Online Ticket',
            email: 'noreply@tokyotower.co.jp'
        },
        toRecipient: {
            typeOf: factory.personType.Person,
            name: (order.customer.name !== undefined) ? String(order.customer.name) : '',
            email: (order.customer.email !== undefined) ? order.customer.email : ''
        },
        about: '東京タワートップデッキツアー 返金完了のお知らせ (Payment Refund Notification for the Tokyo Tower Top Deck Tour)',
        text: message
    };
}
