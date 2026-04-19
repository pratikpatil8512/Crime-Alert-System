// utils/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendOtpEmail(email, otp) {
  await transporter.sendMail({
    from: `Crime Alert System <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your OTP for Email Verification',
    html: `<p>Greetings from Crime Alert System.<br>Your OTP to verify your email is: <b>${otp}</b></p>
           <p><b>Note:</b> You have only <b>3</b> attempts to enter the correct OTP. The OTP is valid for 10 minutes.</p>`
  });
}

module.exports = sendOtpEmail;
