require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const saveToGoogleForm = async (data) => {
 const scriptURL = "https://script.google.com/macros/s/AKfycbz2bXSEu-XYrExgPuLr5NxKjJVCA4l0O3YzlRZ4gb6KUuj52oqeMUhGFRGRC8Aa9dNaGQ/exec"; // Apne Google Apps Script ka URL yahan daalein
  
  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      mode: "no-cors", 
      redirect: "follow", // Google Forms ke liye zaroori hai
    headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
   body: JSON.stringify(data),
    });

    const result = await response.text();
    console.log("📥 Google ki taraf se response:", result);
  } catch (err) {
    console.error("❌ Render Backend mein error:", err);
  }
};

app.post("/create-order", async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: req.body.amount * 100,
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });
    res.json({ order_id: order.id, amount: order.amount });
  } catch (err) {
    res.status(500).json({ error: "Order failed" });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, guestData } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment verify hote hi sheet mein save karein
      await saveToGoogleForm({ ...guestData, paymentId: razorpay_payment_id });
      return res.json({ status: "success" });
    } else {
      return res.status(400).json({ status: "signature_failed" });
    }
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ status: "error" });
  }
});

app.listen(process.env.PORT || 5000);