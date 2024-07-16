import offers from './models/offers';


interface Rating {
  name: String;
  count: Number;
}
async function addOffer(id: string, link: string, ratings: Rating[], responses: Number ) {
    try {
      const newOffer = new offers({
        id: id,
        link: link,
        ratings: ratings,
        totalResponses: responses,
      });
  
      const savedOffer = await newOffer.save();
      console.log('Offer added:', savedOffer);
    } catch (error) {
      console.error('Error adding user:', error);
    }
}

export default addOffer;