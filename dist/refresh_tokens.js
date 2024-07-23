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
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CLIENT_ID = process.env.CLIENT_ID || 'default_client_id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'default_client_secret';
const TOKEN_URL = "https://allegro.pl/auth/oauth/token";
const REDIRECT_URI = "";
function getNextToken(token) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token,
                redirect_uri: REDIRECT_URI
            });
            const response = yield axios_1.default.post(TOKEN_URL, data, {
                auth: {
                    username: CLIENT_ID,
                    password: CLIENT_SECRET
                }
            });
            const tokens = response.data;
            return tokens;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error('Error status:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.status);
                console.error('Error data:', (_b = error.response) === null || _b === void 0 ? void 0 : _b.data);
            }
            throw new Error('Failed to get next token');
        }
    });
}
exports.default = getNextToken;
