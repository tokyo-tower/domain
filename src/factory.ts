/**
 * factory
 * @module
 */

import * as ActionFactory from './factory/action';
import * as AuthorizeActionFactory from './factory/action/authorize';
import * as CreditCardAuthorizeActionFactory from './factory/action/authorize/creditCard';
import * as seatReservationAuthorizeActionFactory from './factory/action/authorize/seatReservation';
import * as PrintActionFactory from './factory/action/transfer/print';
import * as PrintTicketActionFactory from './factory/action/transfer/print/ticket';
import * as EmailMessageFactory from './factory/creativeWork/message/email';
import CreativeWorkType from './factory/creativeWorkType';
import ItemAvailability from './factory/itemAvailability';
import * as MultilingualStringFactory from './factory/multilingualString';
import * as SeatReservationOfferFactory from './factory/offer/seatReservation';
import OrderStatus from './factory/orderStatus';
import * as CorporationOrganizationFactory from './factory/organization/corporation';
import OrganizationType from './factory/organizationType';
import * as CreditCardFactory from './factory/paymentMethod/paymentCard/creditCard';
import PaymentMethodType from './factory/paymentMethodType';
import * as PerformanceFactory from './factory/performance';
import * as PerformanceStatusesFactory from './factory/performanceStatuses';
import * as PersonFactory from './factory/person';
import PersonType from './factory/personType';
import * as CheckinGateFactory from './factory/place/checkinGate';
import * as ScreenFactory from './factory/place/screen';
import PriceCurrency from './factory/priceCurrency';
import * as ReservationFactory from './factory/reservation';
import * as EventReservationFactory from './factory/reservation/event';
import ReservationStatusType from './factory/reservationStatusType';
import * as StockFactory from './factory/stock';
import * as TaskFactory from './factory/task';
import * as CancelCreditCardTaskFactory from './factory/task/cancelCreditCard';
import * as CancelSeatReservationTaskFactory from './factory/task/cancelSeatReservation';
import * as ReturnOrderTaskFactory from './factory/task/returnOrder';
import * as ReturnOrdersByPerformanceTaskFactory from './factory/task/returnOrdersByPerformance';
import * as SendEmailNotificationTaskFactory from './factory/task/sendEmailNotification';
import * as SettleCreditCardTaskFactory from './factory/task/settleCreditCard';
import * as SettleSeatReservationTaskFactory from './factory/task/settleSeatReservation';
import * as TaskExecutionResultFactory from './factory/taskExecutionResult';
import TaskName from './factory/taskName';
import TaskStatus from './factory/taskStatus';
import TicketTypeCategory from './factory/ticketTypeCategory';
import * as PlaceOrderTransactionFactory from './factory/transaction/placeOrder';
import * as ReturnOrderTransactionFactory from './factory/transaction/returnOrder';
import TransactionStatusType from './factory/transactionStatusType';
import TransactionTasksExportationStatus from './factory/transactionTasksExportationStatus';
import TransactionType from './factory/transactionType';
import * as URLFactory from './factory/url';

import ErrorCode from './factory/errorCode';
import * as errors from './factory/errors';

export import errors = errors;
export import errorCode = ErrorCode;

export import actionStatusType = ActionFactory.ActionStatusType;
export import actionType = ActionFactory.ActionType;
export namespace action {
    export import IParticipant = ActionFactory.IParticipant;
    export namespace authorize {
        export import IAction = AuthorizeActionFactory.IAction;
        export import IAttributes = AuthorizeActionFactory.IAttributes;
        export import authorizeActionPurpose = AuthorizeActionFactory.AuthorizeActionPurpose;
        export import creditCard = CreditCardAuthorizeActionFactory;
        export import seatReservation = seatReservationAuthorizeActionFactory;
    }
    export namespace transfer {
        export namespace print {
            export import IAction = PrintActionFactory.IAction;
            export import IAttributes = PrintActionFactory.IAttributes;
            export import IRecipient = PrintActionFactory.IRecipient;
            export import ticket = PrintTicketActionFactory;
        }
    }
}

export namespace paymentMethod {
    export namespace paymentCard {
        export import creditCard = CreditCardFactory;
    }
}
export namespace creativeWork {
    export namespace message {
        export import email = EmailMessageFactory;
    }
}
export import creativeWorkType = CreativeWorkType;
export import itemAvailability = ItemAvailability;
export import multilingualString = MultilingualStringFactory;
export namespace offer {
    export import seatReservation = SeatReservationOfferFactory;
}
export import orderStatus = OrderStatus;
export namespace organization {
    export import corporation = CorporationOrganizationFactory;
}
export import organizationType = OrganizationType;
export import priceCurrency = PriceCurrency;
export import paymentMethodType = PaymentMethodType;
export import performance = PerformanceFactory;
export import performanceStatuses = PerformanceStatusesFactory;
export import person = PersonFactory;
export import personType = PersonType;
export namespace reservation {
    export import reservationType = ReservationFactory.ReservationType;
    export import event = EventReservationFactory;
}
export import stock = StockFactory;
export namespace place {
    export import checkinGate = CheckinGateFactory;
    export import screen = ScreenFactory;
}
export import reservationStatusType = ReservationStatusType;
export namespace task {
    export import IAttributes = TaskFactory.IAttributes;
    export import ITask = TaskFactory.ITask;
    export import cancelCreditCard = CancelCreditCardTaskFactory;
    export import cancelSeatReservation = CancelSeatReservationTaskFactory;
    export import returnOrder = ReturnOrderTaskFactory;
    export import returnOrdersByPerformance = ReturnOrdersByPerformanceTaskFactory;
    export import sendEmailNotification = SendEmailNotificationTaskFactory;
    export import settleCreditCard = SettleCreditCardTaskFactory;
    export import settleSeatReservation = SettleSeatReservationTaskFactory;
}
export import taskExecutionResult = TaskExecutionResultFactory;
export import taskName = TaskName;
export import taskStatus = TaskStatus;
export import ticketTypeCategory = TicketTypeCategory;
export namespace transaction {
    export import placeOrder = PlaceOrderTransactionFactory;
    export import returnOrder = ReturnOrderTransactionFactory;
}
export import transactionStatusType = TransactionStatusType;
export import transactionTasksExportationStatus = TransactionTasksExportationStatus;
export import transactionType = TransactionType;
export import url = URLFactory;
