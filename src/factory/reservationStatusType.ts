/**
 * Enumerated status values for Reservation.
 * @enum reservationStatusType
 */
enum ReservationStatusType {
    /**
     * The status for a previously confirmed reservation that is now cancelled.
     * @memberof {ReservationStatusType}
     */
    ReservationCancelled = 'ReservationCancelled',
    /**
     * The status of a confirmed reservation.
     * @memberof {ReservationStatusType}
     */
    ReservationConfirmed = 'ReservationConfirmed',
    /**
     * The status of a reservation on hold pending an update like credit card number or flight changes.
     * @memberof {ReservationStatusType}
     */
    ReservationHold = 'ReservationHold',
    /**
     * The status of a reservation when a request has been sent, but not confirmed.
     * @memberof {ReservationStatusType}
     */
    ReservationPending = 'ReservationPending'
}

export default ReservationStatusType;
