import mongoose from "mongoose"

const offersSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  link: {
    type: String,
    required: true
  },
  ratings: [
    {
      name: String,
      count: Number
    }
  ],
  totalResponses: {
    type: Number,
    default: 0
  }
})

export default mongoose.model("Offers", offersSchema)
