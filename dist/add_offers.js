"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const offers_1 = __importDefault(require("./models/offers"));
function addOffer(id, link, ratings, responses) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const newOffer = new offers_1.default({
                id: id,
                link: link,
                ratings: ratings,
                totalResponses: responses,
            });
            const savedOffer = yield newOffer.save();
            console.log('Offer added:', savedOffer);
        }
        catch (error) {
            console.error('Error adding user:', error);
        }
    });
}
exports.default = addOffer;
