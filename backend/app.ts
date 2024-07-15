import axios from 'axios';
import dotenv from "dotenv";
import express, { ErrorRequestHandler } from "express";
import { URLSearchParams } from 'url';
import mongoose, { Mongoose } from "mongoose";
import cron from "node-cron";
import User from "./models/user"

dotenv.config();

const app = express();

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


async function awaitForAccessToken(interval: number, deviceCode: string): Promise<string | null> {
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
          console.error('Error in awaitForAccessToken:', error);
          // throw error;
      }
  }
}


var access_token = null 

mongoose
  .connect(process.env.DATABASE_URL as string)

  .then( async(result) => {
    console.log("Connected with database");
    app.listen(process.env.PORT || 3000);
    
    cron.schedule('*/5 * * * *', async () => {
      try {
        const seller = await User.findOne({email: CLIENT_MAIL});
        if (seller) {
          var access_token = seller.access_token
        } else {
          console.log("No seller found with the provided email.");
        }
      } catch (error) {
        console.error("Error fetching seller:", error);
      }

      


    });
})





// getCode().then(async response => {

//     access_token = await awaitForAccessToken(response.interval, response.device_code)
//     console.log('Access token:', access_token);

// }).catch(error => {
//     console.error('Error:', error);
// });
