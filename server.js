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
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
      payment_capture: 0 // MANUAL CAPTURE
    });

    res.json({
      orderId: order.id,
      amount: order.amount
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* VERIFY PAYMENT */
app.post("/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: "Payment verification failed" });
  }
});

/* CAPTURE PAYMENT */
app.post("/capture-payment", async (req, res) => {
  try {
    const { payment_id, amount } = req.body; // amount in rupees

    // Capture payment
    const captureResponse = await razorpay.payments.capture(payment_id, amount * 100, "INR");

    res.json({ status: "success", data: captureResponse });
  } catch (err) {
    console.error("CAPTURE ERROR:", err);
    res.status(500).json({ status: "capture_failed", error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
