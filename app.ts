import axios from 'axios';
import dotenv from "dotenv";
import mongoose from "mongoose";
import nodemailer from 'nodemailer';
import User from "./models/user"
import Offers from "./models/offers";
import getNextToken from "./refresh_tokens"
import { exit } from 'process';

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID || 'default_client_id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'default_client_secret';
const CLIENT_MAIL = process.env.CLIENT_MAIL || "wojtekmarcela@interia.pl"
const CODE_URL = "https://allegro.pl/auth/oauth/device"
const TOKEN_URL = "https://allegro.pl/auth/oauth/token"

async function getCode() {
    try {
        const payload = new URLSearchParams();
        payload.append('client_id', CLIENT_ID);

        const headers = {
            'Content-type': 'application/x-www-form-urlencoded'
        };
        

        const response = await axios.post(CODE_URL, payload.toString(), {
            auth: {
                username: CLIENT_ID,
                password: CLIENT_SECRET
            },
            headers: headers,
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });

        return response.data;
    } catch (error) {
        console.error('Error getting code:', error);
        throw error;
    }
}

async function getAccessToken(deviceCode: string): Promise<any> {
  try {
      const headers = { 'Content-type': 'application/x-www-form-urlencoded' };
      const data = {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode
      };
      const response = await axios.post(TOKEN_URL, data, {
          auth: {
              username: CLIENT_ID,
              password: CLIENT_SECRET
          },
          headers: headers
      });
      return response.data;
  } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
  }
}


async function awaitForAccessToken(interval: number, deviceCode: string): Promise<any> {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));
      try {
          const resultAccessToken = await getAccessToken(deviceCode);
          if (resultAccessToken.error) {
              if (resultAccessToken.error === 'slow_down') {
                  interval += interval;
              } else if (resultAccessToken.error === 'access_denied') {
                  return null;
              }
          } else {
              return resultAccessToken;
          }
      } catch (error) {
          console.error('User has not authorized the device code yet.');
          // throw error;
      }
  }
}

async function getTokens (): Promise<any> {
  getCode().then(async response => {
    console.log(response);
    var tokens = null;
    tokens = await awaitForAccessToken(response.interval, response.device_code)
    if (tokens) {
      const user = await User.findOneAndUpdate({email: CLIENT_MAIL}, {access_token: tokens.access_token, refresh_token: tokens.refresh_token}, {new: true});
      console.log('User updated:', user);
    }

  }).catch(error => {
      console.error('Error:', error.data);
  });
} 

async function checkRatingsAndUpdate (offer: any, newData: any): Promise<any> {
  let message = `Nowe opinie w aukcji: ${offer.link} \n`
  if (offer.totalResponses == 0) {
    await Offers.findByIdAndUpdate(offer._id, {ratings: newData.scoreDistribution, totalResponses: newData.totalResponses}, {new: true});
    return "Nothing changed"
  }
    let something_changed = false
    for (let i = 0; i < offer.ratings.length; i++) {
      console.log('Current offer ratings:', offer.ratings[i].name, 'Count:', offer.ratings[i].count)
      console.log('Incoming ratings:', newData.scoreDistribution[i].name, 'Count:', newData.scoreDistribution[i].count)

      if (offer.ratings[i].count < newData.scoreDistribution[i].count) {
        console.log('New count:', newData.scoreDistribution[i].count);
        console.log('Old count:', offer.ratings[i].count);
        let difference = newData.scoreDistribution[i].count - offer.ratings[i].count
        message += `${offer.ratings[i].name} ★: ${difference} nowych opinii \n`
        something_changed = true
      }
    }
    
    await Offers.findByIdAndUpdate(offer._id, {ratings: newData.scoreDistribution, totalResponses: newData.totalResponses}, {new: true});
    if (something_changed) {
      console.log(message);
      return message;
    }
    else {
      console.log("Nothing changed");
      return "Nothing changed"
    }

}

async function sendNotification (messages: string[]) {
  let final_message = ''
  for (let message of messages) {
    final_message += message + '\n'
  }
  var transporter = nodemailer.createTransport({
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
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

mongoose
  .connect(process.env.DATABASE_URL as string)
  .then( async(result) => {
    console.log("Started program"); 
    let access_token = ""
    let refresh_token = ""
    try {
      const seller = await User.findOne({email: CLIENT_MAIL});
      if (seller) {
        if (seller.access_token != "") {
          access_token = seller.access_token
          refresh_token = seller.refresh_token
        } else {
          await getTokens()
          access_token = seller.access_token
        }
      } else {
        console.log("No seller found with the provided email.");
      }
    } catch (error) {
      console.error("Error fetching seller:", error);
    }
  
  
    let headers = {
      'Authorization': `Bearer ${access_token}`,
      'Accept': 'application/vnd.allegro.public.v1+json',
      'Accept-Language': 'pl-PL',
      'Content-Type': 'application/vnd.allegro.public.v1+json',
    };
    
    const offers = await Offers.find()
    let messagesArray = [];
    for (let offer of offers) {
      let response = null;
      try {
        response = await axios.get(`https://api.allegro.pl/sale/offers/${offer.id}/rating`, { headers });
      } catch (err: any) {
        if (err.response.status == 401) {
          console.log("Access token expired. Refreshing...");
          const newTokens = await getNextToken(refresh_token);
          if (newTokens) {
            await User.findOneAndUpdate({email: CLIENT_MAIL}, {access_token: newTokens.access_token, refresh_token: newTokens.refresh_token}, {new: true});
            access_token = newTokens.access_token;
            console.log("Tokens updated successfully")
            headers = {
              'Authorization': `Bearer ${access_token}`,
              'Accept': 'application/vnd.allegro.public.v1+json',
              'Accept-Language': 'pl-PL',
              'Content-Type': 'application/vnd.allegro.public.v1+json',
            };
            response = await axios.get(`https://api.allegro.pl/sale/offers/${offer.id}/rating`, { headers });
  
          } else {
            console.log("Failed to refresh access token.");
          }
        }
        else {
          console.log(err)
        }         
      }
      
      if (!offer.ratings) {
        await Offers.findOneAndUpdate(
          {id: offer.id},
          {
            $set: {
              ratings: response!.data.scoreDistribution,
              totalResponses: response!.data.totalResponses,
            }
          }
  
        )
      }
      const message = await checkRatingsAndUpdate(offer, response!.data);
      if (message != "Nothing changed") {
        messagesArray.push(message);
      }
    }
    console.log(messagesArray);
    if (messagesArray.length > 0) {
      await sendNotification(messagesArray);
    }
    else {
      console.log("No new ratings found in any of the offers.");
    }
    return exit(0);
})
