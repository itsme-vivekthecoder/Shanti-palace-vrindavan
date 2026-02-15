require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(cors({
    origin: "*", // Ye har jagah se request allow kar dega
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* CREATE ORDER */
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,   // ₹ → paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json({
      order_id: order.id,
      amount: order.amount
    });
  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* VERIFY PAYMENT */
app.post("/verify-payment", async (req, res) => {
  try {
    const { 
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      guestData // Frontend se data aana chahiye
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      
      // 1. Google Sheet mein data bhejo (Agar function niche define hai toh)
      // await sendToGoogleSheet(guestData); 
      
      console.log("Payment Verified for:", razorpay_order_id);

      // 2. Sirf EK baar response bhejo aur 'return' karo
      return res.json({ status: "success" });

    } else {
      // Galat signature par yahan se return ho jao
      return res.status(400).json({ status: "signature_failed" });
    }

    // Purana "res.json" jo bahar tha, use maine hata diya hai 
    // Taaki 'Headers already sent' wala error na aaye.

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    // Error aane par check karo ki response pehle toh nahi chala gaya
    if (!res.headersSent) {
      return res.status(500).json({ status: "verification_failed" });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});





