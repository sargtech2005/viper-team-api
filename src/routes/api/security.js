/**
 * /api/v1/security — Security Utilities
 * Endpoints: /pwned  /headers  /csp-check
 *
 * /pwned       → HIBP k-anonymity API (free, no key — privacy-safe)
 * /headers     → Fetch a URL and audit its security headers
 * /csp-check   → Analyse a Content-Security-Policy header string
 *
 * No npm install needed — uses existing axios + built-in crypto.
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const crypto  = require('crypto');

function fail(res, msg, code = 400) {
  return res.status(code).json({ success: false, error: msg });
}

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/security/pwned
   ?password=hunter2
   Uses HIBP k-anonymity — only the first 5 chars of the SHA1 hash
   are sent to the API, so the full password is NEVER transmitted.
   ────────────────────────────────────────────────────────────────── */
router.get('/pwned', async (req, res) => {
  const { password } = req.query;
  if (!password) return fail(res, 'password query param is required');

  const hash    = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix  = hash.slice(0, 5);
  const suffix  = hash.slice(5);

  try {
    const { data } = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      timeout: 8000,
    });

    let count = 0;
    const lines = data.split('\n');
    for (const line of lines) {
      const [h, c] = line.trim().split(':');
      if (h === suffix) { count = parseInt(c, 10); break; }
    }

    const pwned = count > 0;
    res.json({
      success:      true,
      pwned,
      times_seen:   count,
      risk:         count === 0 ? 'safe' : count < 100 ? 'low' : count < 10000 ? 'medium' : 'high',
      note:         'Password was hashed client-side; only first 5 chars of SHA1 hash were sent to the API.',
      advice:       pwned ? 'This password has appeared in known data breaches. Do not use it.' : 'This password was not found in known breaches.',
    });
  } catch (e) {
    fail(res, 'HIBP lookup failed: ' + e.message, 500);
  }
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/security/headers
   ?url=https://example.com
   Fetches the URL and audits the HTTP security headers.
   ────────────────────────────────────────────────────────────────── */
router.get('/headers', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url query param is required');

  let parsed;
  try { parsed = new URL(url); } catch { return fail(res, 'Invalid URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) return fail(res, 'Only http/https URLs allowed');

  try {
    const resp = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    const h = resp.headers;

    const SECURITY_HEADERS = [
      { key: 'strict-transport-security', name: 'HSTS',                   impact: 'high' },
      { key: 'content-security-policy',   name: 'Content-Security-Policy',impact: 'high' },
      { key: 'x-frame-options',           name: 'X-Frame-Options',         impact: 'medium' },
      { key: 'x-content-type-options',    name: 'X-Content-Type-Options',  impact: 'medium' },
      { key: 'referrer-policy',           name: 'Referrer-Policy',         impact: 'medium' },
      { key: 'permissions-policy',        name: 'Permissions-Policy',      impact: 'medium' },
      { key: 'x-xss-protection',          name: 'X-XSS-Protection',        impact: 'low' },
    ];

    const present  = [];
    const missing  = [];

    for (const sh of SECURITY_HEADERS) {
      if (h[sh.key]) {
        present.push({ header: sh.name, value: h[sh.key], impact: sh.impact });
      } else {
        missing.push({ header: sh.name, impact: sh.impact, description: `Missing ${sh.name} header` });
      }
    }

    const score = Math.round((present.length / SECURITY_HEADERS.length) * 100);
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 50 ? 'C' : score >= 25 ? 'D' : 'F';

    res.json({
      success: true,
      url,
      status_code:     resp.status,
      score,
      grade,
      headers_present: present.length,
      headers_missing: missing.length,
      present,
      missing,
      server:          h['server'] || null,
      https:           parsed.protocol === 'https:',
    });
  } catch (e) {
    fail(res, 'Could not reach URL: ' + e.message, 502);
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/security/csp
   Body: { "policy": "default-src 'self'; script-src 'unsafe-inline'" }
   Analyses a CSP string and flags unsafe directives.
   ────────────────────────────────────────────────────────────────── */
router.post('/csp', (req, res) => {
  const { policy } = req.body;
  if (!policy) return fail(res, 'policy is required');

  const directives = {};
  const issues     = [];
  const good       = [];

  policy.split(';').forEach(part => {
    const [name, ...vals] = part.trim().split(/\s+/);
    if (!name) return;
    directives[name] = vals;
  });

  // Check for unsafe values
  const UNSAFE_FLAGS = [
    { dir: 'script-src', val: "'unsafe-inline'",  sev: 'high',   msg: "script-src 'unsafe-inline' allows inline script injection" },
    { dir: 'script-src', val: "'unsafe-eval'",    sev: 'high',   msg: "script-src 'unsafe-eval' enables eval() — XSS risk" },
    { dir: 'script-src', val: '*',                sev: 'high',   msg: "script-src wildcard (*) allows scripts from any origin" },
    { dir: 'style-src',  val: "'unsafe-inline'",  sev: 'medium', msg: "style-src 'unsafe-inline' allows injected styles" },
    { dir: 'img-src',    val: '*',                sev: 'low',    msg: "img-src wildcard (*) allows images from any origin" },
    { dir: 'frame-src',  val: '*',                sev: 'medium', msg: "frame-src wildcard (*) allows iframes from any origin" },
  ];

  for (const flag of UNSAFE_FLAGS) {
    const vals = directives[flag.dir] || directives['default-src'] || [];
    if (vals.includes(flag.val)) {
      issues.push({ directive: flag.dir, value: flag.val, severity: flag.sev, description: flag.msg });
    }
  }

  if (!directives['default-src']) {
    issues.push({ directive: 'default-src', severity: 'high', description: 'No default-src defined — all sources are allowed by default' });
  } else {
    good.push('default-src is defined');
  }

  if (directives['upgrade-insecure-requests'] || directives['block-all-mixed-content']) {
    good.push('Mixed content protection is enabled');
  }

  const score = Math.max(0, 100 - (issues.filter(i => i.severity === 'high').length * 30) - (issues.filter(i => i.severity === 'medium').length * 15) - (issues.filter(i => i.severity === 'low').length * 5));

  res.json({
    success:    true,
    score,
    grade:      score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'F',
    directives: Object.keys(directives).length,
    issues,
    good,
    raw:        policy,
  });
});

module.exports = router;
