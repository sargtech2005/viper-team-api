/**
 * /api/v1/notify — Send Notifications
 * Endpoints: /email  /webhook
 *
 * Uses existing nodemailer config from src/config/mailer.js
 * No extra npm install needed.
 */

const express = require('express');
const router  = require('express').Router();
const axios   = require('axios');
const { getTransporter } = require('../../config/mailer');

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/notify/email
   Body: {
     "to":        "user@example.com",
     "subject":   "Hello from Viper",
     "body":      "<h1>Hi!</h1><p>This is a test.</p>",
     "from_name": "My App"   ← optional
   }
   
   NOTE: Uses your configured SMTP settings.
         Rate limit applies — don't use for bulk mail.
   ────────────────────────────────────────────────────────────────── */
router.post('/email', async (req, res) => {
  const { to, subject, body, from_name = 'Viper API' } = req.body;

  if (!to)      return res.status(400).json({ success: false, error: 'to is required' });
  if (!subject) return res.status(400).json({ success: false, error: 'subject is required' });
  if (!body)    return res.status(400).json({ success: false, error: 'body is required' });

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ success: false, error: 'Invalid email address in "to" field' });
  }

  try {
    const transporter = await getTransporter();
    const info        = await transporter.sendMail({
      from:    `"${from_name}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html:    body,
      text:    body.replace(/<[^>]+>/g, ''), // strip HTML for plain-text fallback
    });

    res.json({
      success:    true,
      message:    'Email sent successfully',
      to,
      subject,
      message_id: info.messageId,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Email send failed: ' + e.message });
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/notify/webhook
   Forwards a payload to any external webhook URL.
   Body: {
     "url":     "https://hooks.slack.com/...",
     "payload": { "text": "Hello Slack!" },
     "method":  "POST",           ← optional, default POST
     "headers": { "X-Token": "" } ← optional extra headers
   }
   ────────────────────────────────────────────────────────────────── */
router.post('/webhook', async (req, res) => {
  const { url, payload, method = 'POST', headers = {} } = req.body;

  if (!url)     return res.status(400).json({ success: false, error: 'url is required' });
  if (!payload) return res.status(400).json({ success: false, error: 'payload is required' });

  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (!validMethods.includes(method.toUpperCase())) {
    return res.status(400).json({ success: false, error: `method must be one of: ${validMethods.join(', ')}` });
  }

  const start = Date.now();
  try {
    const resp = await axios({
      method: method.toUpperCase(),
      url,
      data:    payload,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':   'ViperAPI-Webhook/1.0',
        ...headers,
      },
      timeout: 15000,
    });

    res.json({
      success:          true,
      delivered:        true,
      url,
      method:           method.toUpperCase(),
      response_status:  resp.status,
      response_time_ms: Date.now() - start,
    });
  } catch (e) {
    res.json({
      success:          false,
      delivered:        false,
      url,
      method:           method.toUpperCase(),
      response_status:  e.response?.status || null,
      response_time_ms: Date.now() - start,
      error:            e.message,
    });
  }
});

module.exports = router;
