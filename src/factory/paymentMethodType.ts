/**
 * 決済方法タイプ
 * @namespace paymentMethodType
 */

import * as GMO from '@motionpicture/gmo-service';

enum PaymentMethodType {
    CreditCard = GMO.utils.util.PayType.Credit,
    Cvs = GMO.utils.util.PayType.Cvs
    /**
     * CP支払い
     */
    // Cp = 'CP'
    /**
     * 売掛（納品書・請求書支払い）
     */
    // Invoice = 'I',
    // /**
    //  * 団体予約
    //  */
    // GroupReservation = 'O',
    // /**
    //  * 貸切予約
    //  */
    // Charter = 'C',
    // /**
    //  * 無料招待券
    //  */
    // Invitaion = 'F'
}

export default PaymentMethodType;
