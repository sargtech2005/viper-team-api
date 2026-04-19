/**
 * /api/v1/network — Web & Network Tools
 * Endpoints: /whois  /dns  /ssl  /headers  /status  /ping
 *
 * npm install whois-json ssl-checker
 */

const express = require('express');
const router  = express.Router();
const dns     = require('dns').promises;
const axios   = require('axios');
const whois   = require('whois-json');
const sslChecker = require('ssl-checker');

/* ──────────────────────────────────────────
   GET /api/v1/network/whois?domain=google.com
   ────────────────────────────────────────── */
router.get('/whois', async (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });

  try {
    const data = await whois(domain.trim().toLowerCase().replace(/^https?:\/\//, ''));
    res.json({ success: true, domain, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /api/v1/network/dns?domain=google.com&type=A
   type options: A | AAAA | MX | TXT | NS | CNAME | SOA | PTR
   ────────────────────────────────────────────────────────── */
router.get('/dns', async (req, res) => {
  const { domain, type = 'A' } = req.query;
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });

  const validTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR'];
  const t = type.toUpperCase();
  if (!validTypes.includes(t)) {
    return res.status(400).json({ success: false, error: `type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const records = await dns.resolve(domain.trim(), t);
    res.json({ success: true, domain, type: t, count: records.length, records });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ──────────────────────────────────────────
   GET /api/v1/network/ssl?domain=google.com
   ────────────────────────────────────────── */
router.get('/ssl', async (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });

  const host = domain.replace(/^https?:\/\//, '').split('/')[0];
  try {
    const result = await sslChecker(host, { method: 'GET', port: 443 });
    res.json({
      success: true,
      domain: host,
      valid: result.valid,
      days_remaining: result.daysRemaining,
      expires: result.validTo,
      issued_from: result.validFrom,
      issuer: result.issuer || null,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'SSL check failed: ' + e.message });
  }
});

/* ──────────────────────────────────────────────────────
   GET /api/v1/network/headers?url=https://google.com
   ────────────────────────────────────────────────────── */
router.get('/headers', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: 'url is required' });

  try {
    const resp = await axios.head(url, { timeout: 8000, maxRedirects: 5 });
    res.json({ success: true, url, status: resp.status, headers: resp.headers });
  } catch (e) {
    const status = e.response?.status || null;
    res.json({ success: false, url, status, error: e.message });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /api/v1/network/status?url=https://google.com
   Returns whether a URL is up or down + response time
   ────────────────────────────────────────────────────────── */
router.get('/status', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: 'url is required' });

  const start = Date.now();
  try {
    const resp = await axios.get(url, { timeout: 10000, maxRedirects: 5 });
    res.json({
      success: true,
      url,
      up: true,
      http_status: resp.status,
      response_time_ms: Date.now() - start,
    });
  } catch (e) {
    res.json({
      success: true,
      url,
      up: false,
      http_status: e.response?.status || null,
      response_time_ms: Date.now() - start,
      error: e.message,
    });
  }
});

/* ─────────────────────────────────────────────────────
   GET /api/v1/network/ping?host=google.com
   DNS-based reachability check (ICMP not available in
   most cloud/container envs; DNS lookup is a valid proxy)
   ───────────────────────────────────────────────────── */
router.get('/ping', async (req, res) => {
  const { host } = req.query;
  if (!host) return res.status(400).json({ success: false, error: 'host is required' });

  const start = Date.now();
  try {
    const addresses = await dns.lookup(host.trim());
    res.json({
      success: true,
      host,
      reachable: true,
      ip: addresses.address,
      family: `IPv${addresses.family}`,
      response_time_ms: Date.now() - start,
    });
  } catch (e) {
    res.json({
      success: true,
      host,
      reachable: false,
      response_time_ms: Date.now() - start,
      error: e.message,
    });
  }
});

// ─── Domain Age ───────────────────────────────────────────────────────────────
// GET /api/v1/network/domain-age?domain=google.com
router.get('/domain-age', async (req, res) => {
  const axios = require('axios');
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ success: false, error: 'domain is required' });

  const clean = domain.replace(/^https?:\/\//i,'').replace(/\/.*/,'').toLowerCase().trim();

  try {
    const { data } = await axios.get('https://www.whoisxmlapi.com/whoisserver/WhoisService', {
      params: { apiKey: 'at_free', domainName: clean, outputFormat: 'JSON' },
      timeout: 12000,
    });

    const wr = data?.WhoisRecord || data?.whoisRecord;
    if (!wr) throw new Error('No WHOIS data');

    const raw = wr.rawText || '';
    const rd  = wr.registryData || wr;

    const created   = rd.createdDate   || wr.createdDate   || raw.match(/creation date[:\s]+([^\n\r]+)/i)?.[1]?.trim() || raw.match(/registered[:\s]+([^\n\r]+)/i)?.[1]?.trim() || null;
    const expires   = rd.expiresDate   || wr.expiresDate   || raw.match(/expir(?:y|ation|es)[^:]*:[:\s]+([^\n\r]+)/i)?.[1]?.trim() || null;
    const updated   = rd.updatedDate   || wr.updatedDate   || raw.match(/updated[^:]*:[:\s]+([^\n\r]+)/i)?.[1]?.trim() || null;
    const registrar = wr.registrarName || rd.registrarName || raw.match(/registrar[:\s]+([^\n\r]+)/i)?.[1]?.trim() || null;

    let age_days = null, age_years = null;
    if (created) {
      const d = new Date(created);
      if (!isNaN(d)) { age_days = Math.floor((Date.now()-d)/86400000); age_years = parseFloat((age_days/365.25).toFixed(1)); }
    }

    res.json({
      success: true, domain: clean, created, expires, updated,
      age_days, age_years,
      age_label: age_years !== null ? `${age_years} year${age_years !== 1 ? 's' : ''}` : null,
      registrar,
      status: Array.isArray(rd.status) ? rd.status : (rd.status ? [rd.status] : []),
    });
  } catch (e) {
    if (e.response?.status === 404 || e.response?.status === 400) return res.status(404).json({ success: false, error: `No WHOIS data found for "${clean}"` });
    res.status(500).json({ success: false, error: 'WHOIS lookup failed: ' + e.message });
  }
});

module.exports = router;
