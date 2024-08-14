// Importing modules
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const sha256 = require("sha256");
const uniqid = require("uniqid");

// Creating express application
const app = express();

// UAT environment variables
const MERCHANT_ID = "M22XB34TDN5Q1";
const PHONE_PE_HOST_URL = "https://api.phonepe.com/apis/hermes"; 
const SALT_INDEX = 1;
const SALT_KEY = "8c830028-50de-41ae-b5f7-c5493ee53ced";
const APP_BE_URL = "https://classypayments.com"; // our application

// Setting up middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Defining a test route
app.get("/", (req, res) => {
  res.send("PhonePe Integration APIs!");
});



//     const {
//       amount = 100,
//       userId = "MUID123",
//       mobileNumber = "99999999",
//       name = "test1",
//       email = "test@gmail.com",
//     } = req.query;

//     // Generate a unique merchant transaction ID for each transaction
//     const merchantTransactionId = uniqid();

//     // Payment payload
//     const normalPayLoad = {
//       merchantId: MERCHANT_ID,
//       merchantTransactionId,
//       merchantUserId: userId,
//       amount: parseInt(amount) * 100, // converting to paise
//       redirectUrl: `${APP_BE_URL}/payment/validate/${merchantTransactionId}`,
//       redirectMode: "REDIRECT",
//       mobileNumber,
//       paymentInstrument: { type: "PAY_PAGE" },
//     };

//     // Create base64 encoded payload
//     const base64EncodedPayload = Buffer.from(JSON.stringify(normalPayLoad), "utf8").toString("base64");

//     // Create X-VERIFY header
//     const xVerifyChecksum = sha256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + "###" + SALT_INDEX;
//     // Send payment request
//     const response = await axios.post(
//       `${PHONE_PE_HOST_URL}/pg/v1/pay`,
//       { request: base64EncodedPayload },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "X-VERIFY": xVerifyChecksum,
//           accept: "application/json",
//         },
//       }
//     );

//     // Check if the response has the expected structure
//     if (response.data && response.data.data && response.data.data.instrumentResponse) {
//       res.status(200).redirect(response.data.data.instrumentResponse.redirectInfo.url);
//     } else {
//       throw new Error("Unexpected response structure from PhonePe API");
//     }
//   } catch (error) {
//     console.error("Payment initiation error:", error.message);
//     res.status(500).json({ message: "Payment initiation failed.", error: error.message });
//   }
// });
app.post("/pay",(req,res)=>{
    try {
    const {
      amount = 100,
      userId = "MUID123",
      mobileNumber = "99999999",
      name = "test1",
      email = "test@gmail.com",
    } = req.body;
        // Generate a unique merchant transaction ID for each transaction
    const merchantTransactionId = uniqid();

    // Payment payload
    const normalPayLoad = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: userId,
      amount: parseInt(amount) * 100, // converting to paise
      redirectUrl: `${APP_BE_URL}/payment/validate/${merchantTransactionId}`,
      redirectMode: "POST",
      mobileNumber,
      paymentInstrument: { type: "PAY_PAGE" },
    };

        // Create base64 encoded payload
    const base64EncodedPayload = Buffer.from(JSON.stringify(normalPayLoad), "utf8").toString("base64");

    // Create X-VERIFY header
    const xVerifyChecksum = sha256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + "###" + SALT_INDEX;
  ;
    const URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";
    // const URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay"
    // Send payment request
    const options = {
      method: "POST",
      url: URL,
      data:{
        request: base64EncodedPayload,
      },
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": xVerifyChecksum,
      },
       
    };  

    axios.request(options).then(function (response) {
      // return res.redirect(response.data.data.instrumentResponse.redirectInfo.url)
      return res.status(200).send(response.data.data.instrumentResponse.redirectInfo.url);
    })
    .catch(function (error) {
      console.error(error);
    });
  } catch(error){
    res.status(500).send({
      message: error.message,
      success: false,
    });
    // res.status(500).json({ message: "Payment initiation failed.", error: error.message });
  }
})

app.post("/payment/validate/:`merchantTransactionId`",async(req,res)=>{
  const { merchantTransactionId } = req.params;
  const xVerifyChecksum = sha256(`/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}${SALT_KEY}`) + "###" + SALT_INDEX;
  const URL = `https://api.phonepe.com/apis/hermes/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
  // const URL = https://api.phonepe.com/apis/hermes/pg/v1/status/M1WWAWTN8661/${merchantTransactionId}
  const options = {
    method: "GET",
    url: URL,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-VERIFY": xVerifyChecksum,
      "X-MERCHANT-ID": MERCHANT_ID,
    },
  };
  // CHECK PAYMENT TATUS

  axios
    .request(options)
    .then(async (response) => {
      console.log(response);
    })
    .catch((error) => {
      console.error(error);
    });

})

// Starting the server
const port = 3002;
app.listen(port, () => {
  console.log(`PhonePe application listening on port ${port}`);
});
