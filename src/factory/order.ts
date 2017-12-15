/**
 * order factory
 * An order is a confirmation of a transaction (a receipt),
 * which can contain multiple line items, each represented by an Offer that has been accepted by the customer.
 * 注文ファクトリー
 * @namespace order
 */

import OrderStatus from './orderStatus';
import PriceCurrency from './priceCurrency';

/**
 * payment method interface
 * 決済方法イーターフェース
 * @export
 * @interface
 * @memberof order
 */
export interface IPaymentMethod {
    name: string;
    /**
     * The name of the credit card or other method of payment for the order.
     */
    paymentMethod: string;
    /**
     * An identifier for the method of payment used (e.g.the last 4 digits of the credit card).
     */
    paymentMethodId: string;
}

/**
 * discount interface
 * 割引インターフェース
 * @export
 * @interface
 * @memberof order
 */
export interface IDiscount {
    name: string;
    /**
     * Any discount applied.
     */
    discount: number;
    /**
     * Code used to redeem a discount.
     */
    discountCode: string;
    /**
     * The currency (in 3 - letter ISO 4217 format) of the discount.
     */
    discountCurrency: string;
}

/**
 * key for inquiry of the order
 * 注文照会キーインターフェース
 * @export
 * @interface
 * @memberof order
 */
export interface IOrderInquiryKey {
    performanceDay: string;
    paymentNo: string;
    telephone: string;
}

/**
 * order interface
 * 注文インターフェース
 * @export
 * @interface
 * @memberof order
 */
export interface IOrder {
    /**
     * object type
     */
    typeOf: string;
    /**
     * A number that confirms the given order or payment has been received.
     */
    confirmationNumber: string;
    /**
     * The merchant- specific identifier for the transaction.
     */
    orderNumber: string;
    /**
     * The total price of the entire transaction.
     */
    price: number;
    /**
     * The currency (in 3 - letter ISO 4217 format) of the order price.
     */
    priceCurrency: PriceCurrency;
    /**
     * payment methods
     */
    paymentMethods: IPaymentMethod[];
    /**
     * discount infos
     */
    discounts: IDiscount[];
    /**
     * URL	(recommended for confirmation cards/ Search Answers)
     * URL of the Order, typically a link to the merchant's website where the user can retrieve further details about an order.
     */
    url: string;
    /**
     * OrderStatus	(recommended for confirmation cards/ Search Answers)
     * The current status of the order.
     */
    orderStatus: OrderStatus;
    /**
     * Date order was placed.
     */
    orderDate: Date;
    /**
     * Was the offer accepted as a gift for someone other than the buyer.
     */
    isGift: boolean;
    /**
     * key for inquiry (required)
     */
    orderInquiryKey: IOrderInquiryKey;
}
