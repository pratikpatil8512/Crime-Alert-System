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

async function sendOtpEmail(email, otp, content="", note="") {
  await transporter.sendMail({
    from: `Crime Alert System <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Mail From Crime Alert System.',
    html: `<p>Greetings from Crime Alert System.<br>${content} ${otp} ${note}</b></p>
           `
  });
}

module.exports = sendOtpEmail;
