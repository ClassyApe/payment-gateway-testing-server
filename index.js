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
const PHONE_PE_HOST_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay"; 
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

app.post("/pay",(req,res)=>{
    try {
    const {
      amount,
      userId ,
      mobileNumber = "99999999",
    } = req.body;
        // Generate a unique merchant transaction ID for each transaction
    const merchantTransactionId = uniqid();

    // Payment payload
    const normalPayLoad = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: userId ?? 'MUID123',
      amount: parseInt(amount) * 100 ?? 100, // converting to paise
      redirectUrl: `${APP_BE_URL}/payment/validate/${merchantTransactionId}`,
      callback :`${APP_BE_URL}`,
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

// Endpoint to check the status of payment
app.get("/payment/validate/:merchantTransactionId", async (req, res) => {
  const { merchantTransactionId } = req.params;

  if (!merchantTransactionId) {
    return res.status(400).json({ message: "Missing merchantTransactionId" });
  }

  try {
    const statusUrl = `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;

    // Create X-VERIFY header
    const xVerifyChecksum = sha256(`/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}${SALT_KEY}`) + "###" + SALT_INDEX;

    // Send status check request
    const response = await axios.get(statusUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerifyChecksum,
        accept: "application/json",
      },
    });

    console.log("Payment status response:", response.data);

    if (response.data && response.data.code === "PAYMENT_SUCCESS") {
      // Payment is successful
      res.json(response.data);
    } else if (response.data && response.data.code) {
      res.status(200).json({ message: "Payment failed or pending.", statusCode: response.data.code });
    } else {
      throw new Error("Unexpected response structure from PhonePe API");
    }
  } catch (error) {
    console.error("Payment status check error:", error.message);
    res.status(500).json({ message: "Payment status check failed.", error: error.message });
  }
});

// Starting the server
const port = 3002;
app.listen(port, () => {
  console.log(`PhonePe application listening on port ${port}`);
});
