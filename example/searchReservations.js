const ttts = require('../lib/index');
const moment = require('moment-timezone');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
    const reservations = await reservationRepo.search(
        {
            reservationStatuses: [ttts.factory.reservationStatusType.ReservationConfirmed],
            // performance_day: '20190612',
            // performanceStartFrom: moment().add(-1, 'week').toDate(),
            reservationFor: {
                startFrom: moment('2019-06-11T00:00:00+0900').toDate(),
                // startThrough: moment('2019-06-12T00:00:00+0900').toDate(),
            },
            // reservationNumber: '^8',
            // reservationNumbers: ['200300'],
            additionalProperty: {
                // $in: [{ name: 'extra', value: '1' }]
                $nin: [{ name: 'extra', value: '1' }]
            },
            underName: {
                identifiers: [{ name: 'orderNumber', value: 'TT-190612-200300' }]
            },
            // sort: {
            //     performance_day: 1,
            //     performance_start_time: 1,
            //     payment_no: 1,
            //     ticket_type: 1
            // },
            sort: {
                reservationStatus: 1,
                'reservationFor.startDate': 1,
                reservationNumber: 1,
                'reservedTicket.ticketType.id': 1,
                'reservedTicket.ticketedSeat.seatNumber': 1
            }
        }
    );
    console.log(reservations.map((r) => `${r.id} ${r.reservedTicket.ticketedSeat.seatNumber}`));
    console.log(reservations.length, 'reservations found');
}

main().then().catch(console.error);
