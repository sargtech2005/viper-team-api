const nodemailer = require('nodemailer');
const { getSetting } = require('./settings');

/**
 * Build a transporter using DB settings (with process.env fallback).
 * Called fresh on every send so admin changes take effect immediately.
 */
async function getTransporter() {
  const host = await getSetting('SMTP_HOST', process.env.SMTP_HOST || 'smtp.gmail.com');
  const port = parseInt(await getSetting('SMTP_PORT', process.env.SMTP_PORT || '587'));
  const user = await getSetting('SMTP_USER', process.env.SMTP_USER || '');
  const pass = await getSetting('SMTP_PASS', process.env.SMTP_PASS || '');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function getFrom() {
  const user = await getSetting('SMTP_USER', process.env.SMTP_USER || '');
  return await getSetting('SMTP_FROM', process.env.SMTP_FROM || `Viper-Team API <${user}>`);
}

// ─── Email Templates ──────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Viper-Team API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a12; color: #e2e8f0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #12121e; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #10b981); padding: 32px; text-align: center; }
    .header h1 { font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .header p  { color: rgba(255,255,255,0.8); margin-top: 6px; font-size: 14px; }
    .body   { padding: 32px; }
    .body p { color: #94a3b8; line-height: 1.7; margin-bottom: 16px; font-size: 15px; }
    .btn    { display: inline-block; background: linear-gradient(135deg, #7c3aed, #10b981); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 8px 0 16px; }
    .code   { background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; font-family: monospace; font-size: 14px; color: #10b981; word-break: break-all; }
    .footer { text-align: center; padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); }
    .footer p { color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🐍 Viper-Team API</h1>
      <p>Premium APIs for Bots & Automation</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Viper-Team API. All rights reserved.</p>
      <p style="margin-top:4px">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

// ─── Send Functions ───────────────────────────────────────────────────────────

const sendPasswordReset = async (email, username, resetLink) => {
  const html = baseTemplate(`
    <p>Hi <strong>${username}</strong>,</p>
    <p>You requested a password reset for your Viper-Team API account. Click the button below to set a new password:</p>
    <div style="text-align:center;margin:24px 0">
      <a class="btn" href="${resetLink}">Reset My Password</a>
    </div>
    <p>Or copy this link into your browser:</p>
    <div class="code">${resetLink}</div>
    <p style="margin-top:16px;font-size:13px;color:#64748b">
      ⚠️ This link expires in <strong style="color:#fbbf24">1 hour</strong>. 
      If you didn't request this, your account is safe — just ignore this email.
    </p>
  `);
  const transporter = await getTransporter();
  const from = await getFrom();
  return transporter.sendMail({ from, to: email, subject: '🔐 Reset Your Viper-Team API Password', html });
};

const sendWelcome = async (email, username) => {
  const html = baseTemplate(`
    <p>Hi <strong>${username}</strong> 👋</p>
    <p>Welcome to <strong>Viper-Team API</strong>! Your account is ready. You can now log in, explore our 100+ APIs, and start building.</p>
    <div style="text-align:center;margin:24px 0">
      <a class="btn" href="${process.env.APP_URL}/login">Go to Dashboard</a>
    </div>
    <p>If you have any questions, reach out to our support team anytime.</p>
  `);
  const transporter = await getTransporter();
  const from = await getFrom();
  return transporter.sendMail({ from, to: email, subject: '🐍 Welcome to Viper-Team API!', html });
};

module.exports = { sendPasswordReset, sendWelcome };
