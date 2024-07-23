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
const user_1 = __importDefault(require("./models/user"));
function addUser(email, accessToken, refreshToken) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const newUser = new user_1.default({
                email: email,
                access_token: accessToken,
                refresh_token: refreshToken
            });
            const savedUser = yield newUser.save();
            console.log('User added:', savedUser);
        }
        catch (error) {
            console.error('Error adding user:', error);
        }
    });
}
