/**
 * /api/v1/tempemail — Temporary Email with Inbox
 *
 * GET  /api/v1/tempemail/generate              — get a fresh temp email address
 * GET  /api/v1/tempemail/inbox?email=xxx       — read inbox messages
 * GET  /api/v1/tempemail/message?email=xxx&id=yyy — read one full message
 * GET  /api/v1/tempemail/domains               — list available domains
 *
 * Powered by 1secmail.com — free public API, no key needed.
 * ⚠️  These are shared public mailboxes. Never use for sensitive info.
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const crypto  = require('crypto');

const BASE = 'https://www.1secmail.com/api/v1/';
const fail  = (res, msg, code = 400) => res.status(code).json({ success: false, error: msg });

/* ── GET /domains — available @domains ── */
router.get('/domains', async (req, res) => {
  try {
    const { data } = await axios.get(BASE, { params: { action: 'getDomainList' }, timeout: 8000 });
    res.json({ success: true, domains: data, count: data.length });
  } catch (e) {
    // Fallback static list if API is slow
    res.json({ success: true, domains: ['1secmail.com','1secmail.org','1secmail.net','wwjmp.com','esiix.com','xojxe.com','yoggm.com'], count: 7, note: 'Cached list — live fetch failed.' });
  }
});

/* ── GET /generate?domain=1secmail.com ── */
router.get('/generate', async (req, res) => {
  try {
    // Get available domains first
    let domains = ['1secmail.com','1secmail.org','1secmail.net'];
    try {
      const { data } = await axios.get(BASE, { params: { action: 'getDomainList' }, timeout: 5000 });
      if (Array.isArray(data) && data.length) domains = data;
    } catch (_) {}

    // Use requested domain or random one
    const domain = req.query.domain && domains.includes(req.query.domain)
      ? req.query.domain
      : domains[Math.floor(Math.random() * domains.length)];

    // Generate a random username (8-12 chars, lowercase + numbers)
    const chars    = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length   = 8 + Math.floor(Math.random() * 5);
    const bytes    = crypto.randomBytes(length);
    const username = Array.from({ length }, (_, i) => chars[bytes[i] % chars.length]).join('');

    const email    = `${username}@${domain}`;
    const expires  = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour suggestion

    res.json({
      success:    true,
      email,
      username,
      domain,
      inbox_url:  `/api/v1/tempemail/inbox?email=${email}`,
      expires_hint: expires,
      note: '⚠️  This is a PUBLIC shared mailbox. Anyone who knows this address can read its messages. Never use it for sensitive accounts.',
    });
  } catch (e) {
    fail(res, 'Email generation failed: ' + e.message, 500);
  }
});

/* ── GET /inbox?email=user@1secmail.com ── */
router.get('/inbox', async (req, res) => {
  const { email } = req.query;
  if (!email) return fail(res, 'email is required');

  const parts = email.split('@');
  if (parts.length !== 2) return fail(res, 'Invalid email format');
  const [login, domain] = parts;

  try {
    const { data } = await axios.get(BASE, {
      params: { action: 'getMessages', login, domain },
      timeout: 10000,
    });

    res.json({
      success:  true,
      email,
      count:    data.length,
      messages: data.map(m => ({
        id:      m.id,
        from:    m.from,
        subject: m.subject,
        date:    m.date,
        read_url: `/api/v1/tempemail/message?email=${email}&id=${m.id}`,
      })),
    });
  } catch (e) {
    fail(res, 'Inbox fetch failed: ' + e.message, 500);
  }
});

/* ── GET /message?email=user@domain.com&id=123 ── */
router.get('/message', async (req, res) => {
  const { email, id } = req.query;
  if (!email) return fail(res, 'email is required');
  if (!id)    return fail(res, 'id is required');

  const parts = email.split('@');
  if (parts.length !== 2) return fail(res, 'Invalid email format');
  const [login, domain] = parts;

  try {
    const { data } = await axios.get(BASE, {
      params: { action: 'readMessage', login, domain, id },
      timeout: 10000,
    });

    res.json({
      success:     true,
      email,
      id:          data.id,
      from:        data.from,
      subject:     data.subject,
      date:        data.date,
      body_text:   data.textBody  || null,
      body_html:   data.htmlBody  || null,
      attachments: (data.attachments || []).map(a => ({ filename: a.filename, content_type: a.contentType, size: a.size })),
    });
  } catch (e) {
    fail(res, 'Message fetch failed: ' + e.message, 500);
  }
});

module.exports = router;
