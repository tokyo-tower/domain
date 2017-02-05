/// <reference types="mongoose" />
import mongoose = require('mongoose');
declare let Models: {
    Authentication: mongoose.Model<mongoose.Document>;
    CustomerCancelRequest: mongoose.Model<mongoose.Document>;
    Film: mongoose.Model<mongoose.Document>;
    GMONotification: mongoose.Model<mongoose.Document>;
    Member: mongoose.Model<mongoose.Document>;
    Performance: mongoose.Model<mongoose.Document>;
    PreCustomer: mongoose.Model<mongoose.Document>;
    Reservation: mongoose.Model<mongoose.Document>;
    ReservationEmailCue: mongoose.Model<mongoose.Document>;
    Screen: mongoose.Model<mongoose.Document>;
    SendGridEventNotification: mongoose.Model<mongoose.Document>;
    Sequence: mongoose.Model<mongoose.Document>;
    Sponsor: mongoose.Model<mongoose.Document>;
    Staff: mongoose.Model<mongoose.Document>;
    TelStaff: mongoose.Model<mongoose.Document>;
    Theater: mongoose.Model<mongoose.Document>;
    TicketTypeGroup: mongoose.Model<mongoose.Document>;
    Window: mongoose.Model<mongoose.Document>;
};
export default Models;
