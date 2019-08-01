const ttts = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { typeOf: 'Project', id: process.env.PROJECT_ID };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const orderRepo = new ttts.repository.Order(mongoose.connection);
    const cursor = await orderRepo.orderModel.find(
        {
            orderDate: {
                $gte: moment().add(-6, 'months').toDate(),
                $lte: moment().toDate()
            }
        },
        {
            orderNumber: 1,
        }
    )
        .cursor();
    console.log('orders found');

    let i = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const order = doc.toObject();

        await orderRepo.orderModel.findOneAndUpdate(
            { orderNumber: order.orderNumber },
            {
                project: project
            }
        ).exec();
        console.log('added', order.orderNumber, i);
    });

    console.log(i, 'orders project added');
}

main()
    .then()
    .catch(console.error);
