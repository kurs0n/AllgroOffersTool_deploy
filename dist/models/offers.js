"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const offersSchema = new mongoose_1.default.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    link: {
        type: String,
        required: true
    },
    ratings: [{
            name: String,
            count: Number
        }],
    totalResponses: {
        type: Number,
        default: 0
    }
});
exports.default = mongoose_1.default.model("Offers", offersSchema);
