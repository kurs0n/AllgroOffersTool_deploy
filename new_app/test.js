import axios from "axios";

export const handler = async (event) => {
  // TODO implement
    const resp = await axios.get("https://baconipsum.com/api/?type=meat-and-filler",{headers: {
        "Content-Type": "application/json"
    }});
  
  const response = {
    statusCode: 200,
    body: resp.data
  };
  console.log(response.body)
  return response;

};
handler();