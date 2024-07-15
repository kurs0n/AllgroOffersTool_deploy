import mongoose from "mongoose";

const offersSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    link: {
        type: String,
        required: true
    }
});

export default mongoose.model("Offers", offersSchema);