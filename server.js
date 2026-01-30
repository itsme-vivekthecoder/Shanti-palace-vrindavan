require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
const nodemailer = require("nodemailer"); // Agar ye pehle se hai toh dobara mat likhna

// Is block ko 'app.post' se PEHLE daalna hai
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Render environment variable
    pass: process.env.EMAIL_PASS, // Render environment variable (16-digit App Password)
  },
});

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
app.post("/verify-payment",async (req, res) => {
  try {
    const { 
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer_email,
      customer_name,
      room,
      amount
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

  /* server.js mein verify-payment ke andar */
if (expectedSignature === razorpay_signature) {
  const mailOptions = {
    from: '"Shanti Palace Vrindavan" <' + process.env.EMAIL_USER + '>',
    to: customer_email,
    subject: "Booking Confirmed - Shanti Palace Vrindavan",
    html: `
      <div style="font-family: Arial; border: 1px solid #7a1f1f; padding: 20px; border-radius: 10px;">
        <h2 style="color: #7a1f1f;">Booking Confirmed! ✅</h2>
        <p>Radhe Radhe <b>${customer_name}</b>,</p>
        <p>Aapka stay Shanti Palace Vrindavan mein confirm ho gaya hai.</p>
        <hr>
        <p><b>Room Type:</b> ${room}</p>
        <p><b>Amount Paid:</b> ₹${amount}</p>
        <p><b>Payment ID:</b> ${razorpay_payment_id}</p>
        <hr>
        <p>Hum Vrindavan mein aapka swagat karne ke liye taiyar hain!</p>
        <p style="font-size: 12px; color: #666;">📍 Vidhyapeeth Chauraha, Vrindavan</p>
      </div>`
  };
  await transporter.sendMail(mailOptions);
  res.json({ status: "success" });
} else {
      return res.status(400).json({ status: "signature_failed" });
    }

    // ✅ No capture needed
    res.json({ status: "success" });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ status: "verification_failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});





