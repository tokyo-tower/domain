/**
 * task name
 * タスク名
 * @namespace taskName
 */

enum TaskName {
    /**
     * 座席の仮予約削除
     */
    CancelSeatReservation = 'cancelSeatReservation',
    /**
     * クレジットカードのオーソリ取消
     */
    CancelCreditCard = 'cancelCreditCard',
    /**
     * メール通知送信
     */
    SendEmailNotification = 'sendEmailNotification',
    /**
     * 座席予約の資産移動
     */
    SettleSeatReservation = 'settleSeatReservation',
    /**
     * クレジットカード実売上
     */
    SettleCreditCard = 'settleCreditCard',
    /**
     * 返品タスク
     */
    ReturnOrder = 'returnOrder',
    /**
     * パフォーマンスに対する注文返品タスク
     */
    ReturnOrdersByPerformance = 'returnOrdersByPerformance'
}

export default TaskName;
