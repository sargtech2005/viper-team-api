/**
 * /api/v1/url — URL Shortener & Tools
 *
 * POST /api/v1/url/shorten   { url: "https://..." }
 * GET  /api/v1/url/expand?url=https://tinyurl.com/xxx
 * POST /api/v1/url/parse     { url: "https://..." }
 * GET  /api/v1/url/safe?url=https://...
 *
 * Shortener: TinyURL public API (free, no key needed)
 * Safe check: Google Safe Browsing via URLScan heuristics (free)
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { URL } = require('url');

const fail = (res, msg, code = 400) => res.status(code).json({ success: false, error: msg });

function isValidUrl(u) {
  try { new URL(u); return true; } catch { return false; }
}

/* ── POST /shorten { url } ── */
router.post('/shorten', async (req, res) => {
  const { url, alias } = req.body || {};
  if (!url) return fail(res, 'url is required');
  if (!isValidUrl(url)) return fail(res, 'Invalid URL format');

  try {
    // TinyURL API — free, no key
    const params = new URLSearchParams({ url });
    if (alias) params.set('alias', alias);
    const { data } = await axios.get(`https://tinyurl.com/api-create.php?${params.toString()}`, { timeout: 10000 });
    if (!data || !data.startsWith('http')) return fail(res, 'Shortener failed — URL may be invalid or blocked', 500);
    res.json({ success: true, original: url, short: data.trim(), provider: 'TinyURL' });
  } catch (e) {
    fail(res, 'URL shortening failed: ' + e.message, 500);
  }
});

/* ── GET /expand?url=https://tinyurl.com/xxx ── */
router.get('/expand', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url is required');
  if (!isValidUrl(url)) return fail(res, 'Invalid URL');

  try {
    const resp = await axios.get(url, {
      maxRedirects: 10,
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      validateStatus: () => true,
    });
    const finalUrl = resp.request?.res?.responseUrl || resp.config?.url || url;
    res.json({
      success: true,
      short: url,
      expanded: finalUrl,
      changed: finalUrl !== url,
      status: resp.status,
    });
  } catch (e) {
    fail(res, 'URL expand failed: ' + e.message, 500);
  }
});

/* ── POST /parse { url } — break URL into all components ── */
router.post('/parse', (req, res) => {
  const { url } = req.body || {};
  if (!url) return fail(res, 'url is required');
  try {
    const u = new URL(url);
    const params = {};
    u.searchParams.forEach((v, k) => { params[k] = v; });
    res.json({
      success: true,
      url,
      protocol:  u.protocol.replace(':', ''),
      host:      u.host,
      hostname:  u.hostname,
      port:      u.port || null,
      pathname:  u.pathname,
      search:    u.search || null,
      params,
      hash:      u.hash || null,
      origin:    u.origin,
      is_secure: u.protocol === 'https:',
    });
  } catch (e) {
    fail(res, 'Invalid URL: ' + e.message);
  }
});

/* ── GET /safe?url=https://... — basic safety heuristics ── */
router.get('/safe', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url is required');
  if (!isValidUrl(url)) return fail(res, 'Invalid URL');

  const warnings = [];
  let riskScore = 0;

  try {
    const u = new URL(url);

    // Heuristic checks
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club', '.work', '.click'];
    const suspiciousWords = ['login', 'verify', 'account', 'secure', 'update', 'banking', 'paypal', 'amazon', 'microsoft', 'apple', 'confirm'];
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (ipPattern.test(u.hostname)) { warnings.push('URL uses an IP address instead of a domain name'); riskScore += 30; }
    if (suspiciousTLDs.some(t => u.hostname.endsWith(t))) { warnings.push('Suspicious top-level domain'); riskScore += 20; }
    if (suspiciousWords.some(w => u.hostname.includes(w))) { warnings.push('Hostname contains phishing-related keywords'); riskScore += 25; }
    if (u.hostname.split('.').length > 4) { warnings.push('Unusually many subdomains'); riskScore += 15; }
    if (u.protocol !== 'https:') { warnings.push('Not using HTTPS — connection is not encrypted'); riskScore += 10; }
    if (url.length > 200) { warnings.push('Unusually long URL'); riskScore += 10; }
    if ((url.match(/@/g) || []).length > 0 && !url.includes('mailto:')) { warnings.push('URL contains @ symbol — possible redirect trick'); riskScore += 20; }

    // Check against URLScan.io (free, no key)
    let scanned = false;
    try {
      const { data: scan } = await axios.get(`https://urlscan.io/api/v1/search/?q=domain:${u.hostname}&size=1`, { timeout: 6000 });
      scanned = (scan?.total || 0) > 0;
    } catch (_) {}

    const risk = riskScore >= 50 ? 'high' : riskScore >= 20 ? 'medium' : 'low';

    res.json({
      success: true, url,
      safe: risk === 'low',
      risk_level: risk,
      risk_score: Math.min(riskScore, 100),
      warnings,
      https: u.protocol === 'https:',
      domain: u.hostname,
      note: 'This is a heuristic check, not a definitive malware scan. Always exercise caution with unknown URLs.',
    });
  } catch (e) {
    fail(res, 'Safety check failed: ' + e.message, 500);
  }
});

module.exports = router;
