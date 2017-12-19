/**
 * 決済方法タイプ
 * @namespace paymentMethodType
 */

enum PaymentMethodType {
    /**
     * クレジットカード
     */
    CreditCard = 'CreditCard',
    /**
     * CP支払い
     */
    CP = 'CP',
    /**
     * 売掛（納品書・請求書支払い）
     */
    Invoice = 'Invoice',
    /**
     * 団体予約
     */
    GroupReservation = 'GroupReservation',
    /**
     * 貸切予約
     */
    Charter = 'Charter',
    /**
     * 無料招待券
     */
    Invitation = 'Invitation'
}

export default PaymentMethodType;
