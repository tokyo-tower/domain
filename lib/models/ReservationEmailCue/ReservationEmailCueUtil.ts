export default class ReservationEmailCueUtil {
    /** 未送信 */
    public static STATUS_UNSENT = 'UNSENT';
    /** 送信中 */
    public static STATUS_SENDING = 'SENDING';
    /** 送信済 */
    public static STATUS_SENT = 'SENT';

    /** 購入完了 */
    public static TEMPLATE_COMPLETE = 'COMPLETE';
    /** 仮予約完了 */
    public static TEMPLATE_TEMPORARY = 'TEMPORARY';
}
