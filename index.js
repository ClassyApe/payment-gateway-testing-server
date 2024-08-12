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
const APP_BE_URL = "https://classypayments.com/"; // Our application

// Setting up middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Defining a test route
app.get("/", (req, res) => {
  res.send("PhonePe Integration APIs!");
});

// Endpoint to initiate a payment
app.get("/pay", async (req, res, next) => {
  try {
    // Transaction details
    const amount = req.query.amount ? parseInt(req.query.amount) : 100;
    const userId = req.query.userId || "MUID123";
    const mobileNumber = req.query.mobileNumber || "99999999";
    const name = req.query.name || "test1";
    const email = req.query.email || "test@gmail.com";

    // Generate a unique merchant transaction ID for each transaction
    const merchantTransactionId = uniqid();

    // Payment payload
    const normalPayLoad = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: userId,
      amount: amount * 100, // converting to paise
      redirectUrl: `${APP_BE_URL}/payment/validate/${merchantTransactionId}`,
      redirectMode: "REDIRECT",
      mobileNumber,
      name,
      email,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    // Create base64 encoded payload
    const base64EncodedPayload = Buffer.from(JSON.stringify(normalPayLoad), "utf8").toString("base64");

    // Create X-VERIFY header
    const xVerifyChecksum = sha256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + "###" + SALT_INDEX;

    // Send payment request
    const response = await axios.post(
      `${PHONE_PE_HOST_URL}/pg/v1/pay`,
      { request: base64EncodedPayload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          accept: "application/json",
        },
      }
    );

    // Redirect to PhonePe payment page
    res.redirect(response.data.data.instrumentResponse.redirectInfo.url);
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).send("Payment initiation failed.");
  }
});

// Endpoint to check the status of payment
app.get("/payment/validate/:merchantTransactionId", async (req, res) => {
  const { merchantTransactionId } = req.params;

  if (!merchantTransactionId) {
    return res.status(400).send("Missing merchantTransactionId");
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
      // Call the Salesforce API if payment is successful
      const headers = {
        Authorization: `Bearer ${req.query.token}`,
        "Content-Type": "application/json",
      };

      const body = {
        voucherId: req.query.voucherId,
        contactId: req.query.userId,
        amount: req.query.amount,
        contactEmail: req.query.email,
        contactMobile: req.query.phone,
      };

      await axios.post(
        'https://aslam-aisha-dev-ed.my.salesforce.com/services/apexrest/purchaseVoucher',
        body,
        { headers }
      );

      res.send(response.data);
    } else {
      res.status(200).send("Payment failed or pending.");
    }
  } catch (error) {
    console.error("Payment status check error:", error);
    res.status(500).send("Payment status check failed.");
  }
});

// Starting the server
const port = 3002;
app.listen(port, () => {
  console.log(`PhonePe application listening on port ${port}`);
});
