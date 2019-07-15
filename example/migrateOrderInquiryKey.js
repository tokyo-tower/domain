const ttts = require('../lib/index');
const moment = require('moment-timezone');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const orderRepo = new ttts.repository.Order(ttts.mongoose.connection);
    const cursor = await orderRepo.orderModel.find(
        {
            orderDate: {
                $gte: moment().add(-3, 'months').toDate(),
                $lte: moment().toDate()
            },
            // orderDateFrom: moment().add(-1, 'week').toDate(),
            // orderDateFrom: moment().add(-3, 'months').toDate(),
            // orderDateThrough: moment().toDate(),
            // sort: {
            //     orderDate: -1,
            // }
        },
        { orderNumber: 1, orderInquiryKey: 1 }
    ).sort({ orderDate: -1 }).cursor();
    console.log('orders found');
    // return;

    let i = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const order = doc.toObject();
        const confirmationNumber = `${order.orderInquiryKey.performanceDay}${order.orderInquiryKey.paymentNo}`;
        await orderRepo.orderModel.findOneAndUpdate(
            { orderNumber: order.orderNumber },
            {
                confirmationNumber: confirmationNumber
            }
        ).exec();
        console.log('migrated', order.orderNumber, i);
    });

    // for (const order of orders) {
    //     const confirmationNumber = `${order.orderInquiryKey.performanceDay}${order.orderInquiryKey.paymentNo}`;
    //     await orderRepo.orderModel.findOneAndUpdate(
    //         { orderNumber: order.orderNumber },
    //         {
    //             confirmationNumber: confirmationNumber
    //         }
    //     ).exec();
    //     console.log('migrated', order.orderNumber)
    // }

    console.log(i, 'orders migrated');
    // console.log(orders.length, 'orders migrated');
}

main()
    .then()
    .catch(console.error);
