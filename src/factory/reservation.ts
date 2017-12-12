/**
 * reservation factory
 * @namespace reservation
 */

// import * as EventFactory from './event';
// import OrganizationType from './organizationType';
// import PersonType from './personType';
// import PlaceType from './placeType';
import ReservationStatusType from './reservationStatusType';

export enum ReservationType {
    EventReservation = 'EventReservation'
}

/**
 * reservation interface
 * Describes a reservation for travel, dining or an event. Some reservations require tickets.
 * Note: This type is for information about actual reservations,
 * e.g. in confirmation emails or HTML pages with individual confirmations of reservations.
 * For offers of tickets, restaurant reservations, flights, or rental cars, use Offer.
 * @export
 * @interface
 * @memberof reservation
 */
export interface IReservation {
    /**
     * type of object
     */
    typeOf: string;
    /**
     * Current status of the reservation.
     */
    status: ReservationStatusType;
}
