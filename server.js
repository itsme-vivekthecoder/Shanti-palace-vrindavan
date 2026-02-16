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
  const formURL = "https://docs.google.com/forms/d/e/1FAIpQLSciTMHoPTqDOYNXGWZ-U01QO0cihDlAUwiwuu2HjZbXwTLucw/formResponse";

  // URLSearchParams ensures data is sent as 'application/x-www-form-urlencoded'
  const params = new URLSearchParams();
  params.append("entry.1181525787", data.name);
  params.append("entry.26796576", data.email);
  params.append("entry.1505113845", data.phone);
  params.append("entry.133939998", data.room);
  params.append("entry.764039404", data.amount);
  params.append("entry.2021412614", data.paymentId);

  try {
    const response = await fetch(formURL, {
      method: "POST",
      mode: "no-cors", // Google Forms ke liye zaroori hai
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    // Note: 'no-cors' mode mein status hamesha 0 dikhayega, jo ki normal hai
    console.log("✅ Google Form submission attempt complete");
  } catch (err) {
    console.error("❌ Google Sheet Error:", err);
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