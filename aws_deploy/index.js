import axios from "axios";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import User from "./models/user.js";
import Offers from "./models/offers.js";
import getNextToken from "./refresh_tokens.js";
import https from "https";
import dotenv from "dotenv";
import express from "express";

const CODE_URL = "https://allegro.pl/auth/oauth/device"
const TOKEN_URL = "https://allegro.pl/auth/oauth/token"
const CLIENT_ID = process.env.CLIENT_ID || "default_client_id"
const CLIENT_SECRET = process.env.CLIENT_SECRET || "default_client_secret"
const CLIENT_MAIL = process.env.CLIENT_MAIL || "wojtekmarcela@interia.pl"

const client = axios.create({
  timeout: 60000,
  maxContentLength: 500 * 1000 * 1000,
  httpsAgent: new https.Agent({ keepAlive: true, timeout: 60000, keepAliveMsecs: 10000,   maxSockets: Infinity  }),
}) 

async function getCode() {
  try {
    const payload = new URLSearchParams()
    payload.append("client_id", CLIENT_ID)

    const headers = {
      "Content-type": "application/x-www-form-urlencoded"
    }

    const response = await client.post(CODE_URL, payload.toString(), {
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET
      },
      headers: headers
    })

    return response?.data
  } catch (error) {
    console.error("Error getting code:", error)
    throw error
  }
}

async function getAccessToken(deviceCode) {
  try {
    const headers = { "Content-type": "application/x-www-form-urlencoded" }
    const data = {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode
    }
    const response = await client.post(TOKEN_URL, data, {
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET
      },
      headers: headers
    })
    return response?.data
  } catch (error) {
    console.error("Error getting access token:", error)
    throw error
  }
}

async function awaitForAccessToken(interval, deviceCode) {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000))
    try {
      const resultAccessToken = await getAccessToken(deviceCode)
      if (resultAccessToken.error) {
        if (resultAccessToken.error === "slow_down") {
          interval += interval
        } else if (resultAccessToken.error === "access_denied") {
          return null
        }
      } else {
        return resultAccessToken
      }
    } catch (error) {
      console.error("User has not authorized the device code yet.")
      // throw error;
    }
  }
}

async function getTokens() {
  getCode()
    .then(async response => {
      console.log(response)
      var tokens = null
      tokens = await awaitForAccessToken(
        response.interval,
        response.device_code
      )
      if (tokens) {
        const user = await User.findOneAndUpdate(
          { email: CLIENT_MAIL },
          {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          },
          { new: true }
        )
        console.log("User updated:", user)
      }
    })
    .catch(error => {
      console.error("Error:", error?.data)
    })
}

async function checkRatingsAndUpdate(offer, newData) {
  let message = `Nowe opinie w aukcji: ${offer.link} \n`
  if (offer.totalResponses == 0) {
    await Offers.findByIdAndUpdate(
      offer._id,
      {
        ratings: newData?.scoreDistribution,
        totalResponses: newData?.totalResponses
      },
      { new: true }
    )
    return "Nothing changed"
  }
  let something_changed = false
  for (let i = 0; i < offer?.ratings?.length; i++) {
    console.log(
      "Current offer ratings:",
      offer?.ratings[i]?.name,
      "Count:",
      offer?.ratings[i]?.count
    )
    console.log(
      "Incoming ratings:",
      newData?.scoreDistribution[i]?.name,
      "Count:",
      newData?.scoreDistribution[i]?.count
    )

    if (offer?.ratings[i]?.count < newData?.scoreDistribution[i]?.count) {
      console.log("New count:", newData?.scoreDistribution[i]?.count)
      console.log("Old count:", offer?.ratings[i]?.count)
      let difference =
        newData?.scoreDistribution[i]?.count - offer?.ratings[i]?.count
      message += `${offer?.ratings[i]?.name} ★: ${difference} nowych opinii \n`
      something_changed = true
    }
  }

  await Offers.findByIdAndUpdate(
    offer._id,
    {
      ratings: newData?.scoreDistribution,
      totalResponses: newData?.totalResponses
    },
    { new: true }
  )
  if (something_changed) {
    console.log(message)
    return message
  } else {
    console.log("Nothing changed")
    return "Nothing changed"
  }
}

async function sendNotification(messages) {
  let final_message = ""
  for (let message of messages) {
    final_message += message + "\n"
  }
  var transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.SENDING_EMAIL,
      pass: process.env.EMAIL_PASSWORD
    }
  })

  var mailOptions = {
    from: process.env.SENDING_EMAIL,
    to: process.env.CLIENT_MAIL,
    subject: "Masz nowe opinie pod swoimi aukcjami!",
    text: final_message
  }

  await transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error)
      process.exit();
    } else {
      console.log("Email sent: " + info?.response)
      process.exit();
    }
  })
}

// Retry function to retry an async operation with delay
async function retryOperation(operation, retries, delay) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError; // If all attempts fail, throw the last error
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  dotenv.config();
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Started program");
  let access_token = "";
  let refresh_token = "";
  try {
    const seller = await User.findOne({ email: CLIENT_MAIL });
    if (seller) {
      if (seller.access_token != "") {
        access_token = seller?.access_token;
        refresh_token = seller?.refresh_token;
      } else {
        await getTokens();
        access_token = seller?.access_token;
      }
    } else {
      console.log("No seller found with the provided email.");
    }
  } catch (error) {
    console.error("Error fetching seller:", error);
  }

  let headers = {
    Authorization: `Bearer ${access_token}`,
    Accept: "application/vnd.allegro.public.v1+json",
    "Accept-Language": "pl-PL",
    "Content-Type": "application/vnd.allegro.public.v1+json"
  };

  const offers = await Offers.find();
  let messagesArray = [];
  for (let offer of offers) {
    let response = null;
    try {
      // Retry the GET request with 3 attempts and a 2-second delay
      response = await retryOperation(async () => {
        return await client.get(
          `https://api.allegro.pl/sale/offers/${offer.id}/rating`,
          {
            headers
          }
        );
      }, 20, 100); // Retry 3 times with a 2-second delay
    } catch (err) {
      if (err.response?.status == 401) {
        console.log("Access token expired. Refreshing...");
        const newTokens = await getNextToken(refresh_token);
        if (newTokens) {
          await User.findOneAndUpdate(
            { email: process.env.CLIENT_MAIL },
            {
              access_token: newTokens?.access_token,
              refresh_token: newTokens?.refresh_token
            },
            { new: true }
          );
          access_token = newTokens?.access_token;
          console.log("Tokens updated successfully");
          headers = {
            Authorization: `Bearer ${access_token}`,
            Accept: "application/vnd.allegro.public.v1+json",
            "Accept-Language": "pl-PL",
            "Content-Type": "application/vnd.allegro.public.v1+json"
          };
          // Retry the request again after token refresh
          response = await retryOperation(async () => {
            return await client.get(
              `https://api.allegro.pl/sale/offers/${offer.id}/rating`,
              {
                headers
              }
            );
          }, 3, 2000); // Retry 3 times with a 2-second delay
        } else {
          console.log("Failed to refresh access token.");
        }
      } else {
        console.log(err);
      }
    }

    if (!offer.ratings) {
      await Offers.findOneAndUpdate(
        { id: offer.id },
        {
          $set: {
            ratings: response?.data?.scoreDistribution,
            totalResponses: response?.data?.totalResponses
          }
        }
      );
    }
    const message = await checkRatingsAndUpdate(offer, response?.data);
    if (message != "Nothing changed") {
      messagesArray.push(message);
    }
  }
  console.log(messagesArray);
  if (messagesArray.length > 0) {
    sendNotification(messagesArray);
    console.log("Script finished!");
  } else {
    console.log("No new ratings found in any of the offers.");
    console.log("Script finished!"); 
    // process.exit();
  }
  res.send("Script finished!");
  mongoose.connection.close();
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});