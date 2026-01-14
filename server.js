require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* CREATE ORDER */
app.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: "receipt_" + Date.now(),
    payment_capture: 0   // 👈 MANUAL CAPTURE
  });

  res.json({
    orderId: order.id,
    amount: order.amount
  });
});


app.post("/verify-payment", async (req, res) => {
  try {
    const { order_id, payment_id, signature, amount } = req.body;

    const body = order_id + "|" + payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ status: "signature_failed" });
    }

    // 🔥 CAPTURE WITH EXACT AMOUNT
    await razorpay.payments.capture(payment_id, amount);

    res.json({ status: "success" });

  } catch (err) {
    console.error("CAPTURE ERROR:", err);
    res.status(500).json({ status: "capture_failed", error: err.message });
  }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

