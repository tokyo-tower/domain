/**
 * 進行中注文取引サービス
 */
import * as cinerino from '@cinerino/domain';

import * as SeatReservationAuthorizeActionService from './placeOrderInProgress/action/authorize/seatReservation';

export import start = cinerino.service.transaction.placeOrderInProgress4ttts.start;
export import setCustomerContact = cinerino.service.transaction.placeOrderInProgress4ttts.setCustomerContact;
export import confirm = cinerino.service.transaction.placeOrderInProgress4ttts.confirm;

/**
 * 取引に対するアクション
 */
export namespace action {
    /**
     * 取引に対する承認アクション
     */
    export namespace authorize {
        /**
         * 座席予約承認アクションサービス
         */
        export import seatReservation = SeatReservationAuthorizeActionService;
    }
}
