import axios from "axios"
import dotenv from "dotenv"

const CLIENT_ID = process.env.CLIENT_ID || "default_client_id"
const CLIENT_SECRET = process.env.CLIENT_SECRET || "default_client_secret"
const TOKEN_URL = "https://allegro.pl/auth/oauth/token"
const REDIRECT_URI = ""
dotenv.config();

async function getNextToken(token) {
  try {
    const data = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token,
      redirect_uri: REDIRECT_URI
    })

    const response = await axios.post(TOKEN_URL, data, {
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET
      }
    })

    const tokens = response.data
    return tokens
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error status:", error.response?.status)
      console.error("Error data:", error.response?.data)
    }
    throw new Error("Failed to get next token")
  }
}

export default getNextToken
