const ttts = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const orderRepo = new ttts.repository.Order(mongoose.connection);
    const cursor = await orderRepo.orderModel.find(
        {
            orderDate: {
                $gte: moment().add(-4, 'months').toDate(),
                $lte: moment().toDate()
            },
            'customer.identifier': {
                $exists: true,
                $in: [{ name: 'clientId', value: '7tg0gkjnuvgj5p7pehbek7p42s' }]
            }
        },
        {
            orderNumber: 1,
            'customer.identifier': 1
        }
    )
        .cursor();
    console.log('orders found');

    let i = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const order = doc.toObject();

        let customerGroupValue;
        if (Array.isArray(order.customer.identifier)) {
            const customerGroupProperty = order.customer.identifier.find((p) => p.name === 'customerGroup');
            if (customerGroupProperty !== undefined) {
                customerGroupValue = customerGroupProperty.value;
            }
        }

        if (customerGroupValue === undefined) {
            await orderRepo.orderModel.findOneAndUpdate(
                { orderNumber: order.orderNumber },
                {
                    $push: {
                        'customer.identifier': { name: 'customerGroup', value: 'Staff' }
                    }
                }
            ).exec();
            console.log('added', order.orderNumber, i);
        } else {
            console.log('customerGroupValue:', customerGroupValue);
        }
    });

    console.log(i, 'orders customerGroup added');
}

main()
    .then()
    .catch(console.error);
