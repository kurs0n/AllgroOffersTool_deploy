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
const express_1 = __importDefault(require("express"));
const url_1 = require("url");
const mongoose_1 = __importDefault(require("mongoose"));
const node_cron_1 = __importDefault(require("node-cron"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const user_1 = __importDefault(require("./models/user"));
const offers_1 = __importDefault(require("./models/offers"));
const refresh_tokens_1 = __importDefault(require("./refresh_tokens"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const CLIENT_ID = process.env.CLIENT_ID || 'default_client_id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'default_client_secret';
const CLIENT_MAIL = process.env.CLIENT_MAIL || "wojtekmarcela@interia.pl";
const CODE_URL = "https://allegro.pl/auth/oauth/device";
const TOKEN_URL = "https://allegro.pl/auth/oauth/token";
function getCode() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const payload = new url_1.URLSearchParams();
            payload.append('client_id', CLIENT_ID);
            const headers = {
                'Content-type': 'application/x-www-form-urlencoded'
            };
            const response = yield axios_1.default.post(CODE_URL, payload.toString(), {
                auth: {
                    username: CLIENT_ID,
                    password: CLIENT_SECRET
                },
                headers: headers,
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting code:', error);
            throw error;
        }
    });
}
function getAccessToken(deviceCode) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const headers = { 'Content-type': 'application/x-www-form-urlencoded' };
            const data = {
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                device_code: deviceCode
            };
            const response = yield axios_1.default.post(TOKEN_URL, data, {
                auth: {
                    username: CLIENT_ID,
                    password: CLIENT_SECRET
                },
                headers: headers
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting access token:', error);
            throw error;
        }
    });
}
function awaitForAccessToken(interval, deviceCode) {
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            yield new Promise(resolve => setTimeout(resolve, interval * 1000));
            try {
                const resultAccessToken = yield getAccessToken(deviceCode);
                if (resultAccessToken.error) {
                    if (resultAccessToken.error === 'slow_down') {
                        interval += interval;
                    }
                    else if (resultAccessToken.error === 'access_denied') {
                        return null;
                    }
                }
                else {
                    return resultAccessToken;
                }
            }
            catch (error) {
                console.error('User has not authorized the device code yet.');
                // throw error;
            }
        }
    });
}
function getTokens() {
    return __awaiter(this, void 0, void 0, function* () {
        getCode().then((response) => __awaiter(this, void 0, void 0, function* () {
            console.log(response);
            var tokens = null;
            tokens = yield awaitForAccessToken(response.interval, response.device_code);
            if (tokens) {
                const user = yield user_1.default.findOneAndUpdate({ email: CLIENT_MAIL }, { access_token: tokens.access_token, refresh_token: tokens.refresh_token }, { new: true });
                console.log('User updated:', user);
            }
        })).catch(error => {
            console.error('Error:', error.data);
        });
    });
}
function checkRatingsAndUpdate(offer, newData) {
    return __awaiter(this, void 0, void 0, function* () {
        let message = `Nowe opinie w aukcji: ${offer.link} \n`;
        if (offer.totalResponses == 0) {
            yield offers_1.default.findByIdAndUpdate(offer._id, { ratings: newData.scoreDistribution, totalResponses: newData.totalResponses }, { new: true });
            return "Nothing changed";
        }
        if (offer.totalResponses < newData.totalResponses) {
            for (let i = 0; i < offer.ratings.length; i++) {
                console.log('Ratings:', offer.ratings[i].name);
                if (offer.ratings[i].count < newData.scoreDistribution[i].count) {
                    console.log('New count:', newData.scoreDistribution[i].count);
                    console.log('Old count:', offer.ratings[i].count);
                    let difference = newData.scoreDistribution[i].count - offer.ratings[i].count;
                    message += `${offer.ratings[i].name} ★: ${difference} nowych opinii \n`;
                }
            }
            yield offers_1.default.findByIdAndUpdate(offer._id, { ratings: newData.scoreDistribution, totalResponses: newData.totalResponses }, { new: true });
            return message;
        }
        else if (offer.totalResponses > newData.totalResponses) {
            console.log("Someone deleted the rating");
            yield offers_1.default.findByIdAndUpdate(offer._id, { ratings: newData.scoreDistribution, totalResponses: newData.totalResponses }, { new: true });
            return "Nothing changed";
        }
        else {
            return "Nothing changed";
        }
    });
}
function sendNotification(messages) {
    return __awaiter(this, void 0, void 0, function* () {
        let final_message = '';
        for (let message of messages) {
            final_message += message + '\n';
        }
        var transporter = nodemailer_1.default.createTransport({
            service: "Gmail",
            host: "smtp.gmail.com",
            port: 465,
            auth: {
                user: process.env.SENDING_EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        var mailOptions = {
            from: process.env.SENDING_EMAIL,
            to: process.env.CLIENT_MAIL,
            subject: 'Masz nowe opinie pod swoimi aukcjami!',
            text: final_message
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            }
            else {
                console.log('Email sent: ' + info.response);
            }
        });
    });
}
mongoose_1.default
    .connect(process.env.DATABASE_URL)
    .then((result) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Connected with database");
    app.listen(process.env.PORT || 3000);
    let access_token = "";
    let refresh_token = "";
    node_cron_1.default.schedule('*/5 * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("Cron start");
        try {
            const seller = yield user_1.default.findOne({ email: CLIENT_MAIL });
            if (seller) {
                if (seller.access_token != "") {
                    access_token = seller.access_token;
                    refresh_token = seller.refresh_token;
                }
                else {
                    getTokens();
                    access_token = seller.access_token;
                }
            }
            else {
                console.log("No seller found with the provided email.");
            }
        }
        catch (error) {
            console.error("Error fetching seller:", error);
        }
        let headers = {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/vnd.allegro.public.v1+json',
            'Accept-Language': 'pl-PL',
            'Content-Type': 'application/vnd.allegro.public.v1+json',
        };
        const offers = yield offers_1.default.find();
        let messagesArray = [];
        for (let offer of offers) {
            let response = null;
            try {
                response = yield axios_1.default.get(`https://api.allegro.pl/sale/offers/${offer.id}/rating`, { headers });
            }
            catch (err) {
                if (err.response.status == 401) {
                    console.log("Access token expired. Refreshing...");
                    const newTokens = yield (0, refresh_tokens_1.default)(refresh_token);
                    if (newTokens) {
                        yield user_1.default.findOneAndUpdate({ email: CLIENT_MAIL }, { access_token: newTokens.access_token, refresh_token: newTokens.refresh_token }, { new: true });
                        access_token = newTokens.access_token;
                        console.log("Tokens updated successfully");
                        headers = {
                            'Authorization': `Bearer ${access_token}`,
                            'Accept': 'application/vnd.allegro.public.v1+json',
                            'Accept-Language': 'pl-PL',
                            'Content-Type': 'application/vnd.allegro.public.v1+json',
                        };
                        response = yield axios_1.default.get(`https://api.allegro.pl/sale/offers/${offer.id}/rating`, { headers });
                    }
                    else {
                        console.log("Failed to refresh access token.");
                    }
                }
                else {
                    console.log(err);
                }
            }
            if (!offer.ratings) {
                yield offers_1.default.findOneAndUpdate({ id: offer.id }, {
                    $set: {
                        ratings: response.data.scoreDistribution,
                        totalResponses: response.data.totalResponses,
                    }
                });
            }
            const message = yield checkRatingsAndUpdate(offer, response.data);
            if (message != "Nothing changed") {
                messagesArray.push(message);
            }
        }
        console.log(messagesArray);
        if (messagesArray.length > 0) {
            yield sendNotification(messagesArray);
        }
        else {
            console.log("No new ratings found in any of the offers.");
        }
    }));
}));
