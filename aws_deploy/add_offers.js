import offers from "./models/offers"

async function addOffer(id, link, ratings, responses) {
  try {
    const newOffer = new offers({
      id: id,
      link: link,
      ratings: ratings,
      totalResponses: responses
    })

    const savedOffer = await newOffer.save()
    console.log("Offer added:", savedOffer)
  } catch (error) {
    console.error("Error adding user:", error)
  }
}

export default addOffer
