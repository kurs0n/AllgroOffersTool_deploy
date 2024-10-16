import User from "./models/user"

async function addUser(email, accessToken, refreshToken) {
  try {
    const newUser = new User({
      email: email,
      access_token: accessToken,
      refresh_token: refreshToken
    })

    const savedUser = await newUser.save()
    console.log("User added:", savedUser)
  } catch (error) {
    console.error("Error adding user:", error)
  }
}
