/**
 * paymentMethod factory
 * @namespace paymentMethod
 */

import PaymentMethodType from './paymentMethodType';

/**
 * payment method interface
 * @interface {IPaymentMethod}
 * @memberof paymentMethod
 */
export interface IPaymentMethod {
    typeOf: PaymentMethodType;
    identifier: string;
}
