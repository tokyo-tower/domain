/**
 * 決済方法タイプ
 * @namespace paymentMethodType
 */

import * as GMO from '@motionpicture/gmo-service';

enum PaymentMethodType {
    CreditCard = GMO.utils.util.PayType.Credit,
    Cvs = GMO.utils.util.PayType.Cvs
}

export default PaymentMethodType;
