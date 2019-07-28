const ttts = require('../lib/index');

async function main() {
    await ttts.mongoose.connect(process.env.MONGOLAB_URI);

    const ticketOffers = await ttts.service.offer.searchEventOffers(
        {
            project: { id: 'ttts-development' },
            event: { id: '190711001001010900' }
        }
    )({
        project: new ttts.repository.Project(mongoose.connection),
        seller: new ttts.repository.Seller(mongoose.connection)
    });
    console.log(ticketOffers);
    console.log(ticketOffers.length, 'ticketOffers found');
}

main().then().catch(console.error);
