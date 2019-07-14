const ttts = require('../lib/index');
const moment = require('moment-timezone');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const orderRepo = new ttts.repository.Order(ttts.mongoose.connection);
    const orders = await orderRepo.search(
        {
            // orderDateFrom: moment().add(-1, 'week').toDate(),
            orderDateFrom: moment().add(-3, 'months').toDate(),
            orderDateThrough: moment().toDate(),
            sort: {
                orderDate: -1,
            }
        }
    );
    console.log(orders.length, 'orders found');

    for (const order of orders) {
        const confirmationNumber = `${order.orderInquiryKey.performanceDay}${order.orderInquiryKey.paymentNo}`;
        await orderRepo.orderModel.findOneAndUpdate(
            { orderNumber: order.orderNumber },
            {
                confirmationNumber: confirmationNumber
            }
        ).exec();
        console.log('migrated', order.orderNumber)
    }
}

main()
    .then()
    .catch(console.error);
