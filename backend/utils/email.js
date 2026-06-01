const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeMultilineText(value) {
  return escapeHtml(String(value ?? '')).replace(/\n/g, '<br />');
}

function renderBrandTemplate({
  title = 'Crime Alert System',
  subtitle = 'Stay informed with real-time safety updates.',
  accentColor = '#4f46e5',
  badge = 'Crime Alert System',
  bodyHtml = '',
  footerNote = 'This is an automated message from Crime Alert System.',
}) {
  return `
    <div style="margin:0; padding:24px 12px; background:#eef2ff; font-family:Arial, Helvetica, sans-serif; color:#111827;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border-radius:22px; overflow:hidden; box-shadow:0 18px 45px rgba(15,23,42,0.12);">
        <div style="background:linear-gradient(135deg, ${accentColor}, #ef4444); padding:24px 28px; color:#ffffff;">
          <div style="display:inline-flex; align-items:center; gap:10px; margin-bottom:14px;">
            <div style="width:42px; height:42px; border-radius:999px; background:rgba(255,255,255,0.18); display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">CA</div>
            <div style="font-size:13px; font-weight:700; letter-spacing:0.3px; text-transform:uppercase;">${escapeHtml(badge)}</div>
          </div>
          <h1 style="margin:0 0 8px; font-size:28px; line-height:1.2;">${escapeHtml(title)}</h1>
          <p style="margin:0; font-size:15px; line-height:1.6; color:rgba(255,255,255,0.92);">${escapeHtml(subtitle)}</p>
        </div>
        <div style="padding:28px;">
          ${bodyHtml}
        </div>
        <div style="padding:18px 28px; border-top:1px solid #e5e7eb; background:#f8fafc; font-size:12px; line-height:1.6; color:#6b7280;">
          ${escapeHtml(footerNote)}
        </div>
      </div>
    </div>
  `;
}

function renderOtpBody(message) {
  const raw = String(message || '').trim();
  const otpMatch = raw.match(/\b\d{4,8}\b/);
  const otp = otpMatch ? otpMatch[0] : '';

  return `
    <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#374151;">
      ${normalizeMultilineText(raw || 'Use the following verification code to continue.')}
    </p>
    ${
      otp
        ? `<div style="margin:18px 0 6px; display:inline-block; padding:14px 20px; background:#eef2ff; border:1px solid #c7d2fe; border-radius:14px; font-size:28px; font-weight:800; letter-spacing:6px; color:#312e81;">
             ${escapeHtml(otp)}
           </div>`
        : ''
    }
  `;
}

async function sendEmail(to, subjectOrBody, body, options = {}) {
  if (!to) {
    throw new Error('Recipient email is required');
  }

  const isLegacySingleBodyCall = body === undefined && Object.keys(options || {}).length === 0;

  const subject = isLegacySingleBodyCall
    ? /^\d{4,8}$/.test(String(subjectOrBody || '').trim())
      ? 'Your Crime Alert System verification code'
      : 'Crime Alert System notification'
    : subjectOrBody || 'Crime Alert System notification';

  const text = isLegacySingleBodyCall ? String(subjectOrBody || '') : String(body || '');

  const accentColor = options.accentColor || '#4f46e5';
  const bodyHtml =
    options.bodyHtml ||
    (isLegacySingleBodyCall
      ? renderOtpBody(text)
      : `<div style="font-size:15px; line-height:1.7; color:#374151; white-space:pre-line;">${normalizeMultilineText(text)}</div>`);

  const html =
    options.html ||
    renderBrandTemplate({
      title: options.title || subject,
      subtitle: options.subtitle || 'Important update from Crime Alert System.',
      accentColor,
      badge: options.badge || 'Crime Alert System',
      bodyHtml,
      footerNote: options.footerNote || 'Please do not reply to this email unless instructed by your administrator.',
    });

  await transporter.sendMail({
    from: `Crime Alert System <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = sendEmail;
