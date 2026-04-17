const express  = require('express');
const router   = express.Router();
const QRCode   = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const axios    = require('axios');
const crypto   = require('crypto');

// ─── QR Code ──────────────────────────────────────────────────────────────────
router.post('/qr', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  try {
    const dataUrl = await QRCode.toDataURL(String(text), {
      width: 300,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
    res.json({
      success: true,
      data: { qr_base64: dataUrl, text },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'QR generation failed.' });
  }
});

// ─── Base64 ───────────────────────────────────────────────────────────────────
router.post('/base64/encode', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const encoded = Buffer.from(String(text)).toString('base64');
  res.json({ success: true, data: { encoded, original: text } });
});

router.post('/base64/decode', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  try {
    const decoded = Buffer.from(String(text), 'base64').toString('utf8');
    res.json({ success: true, data: { decoded, original: text } });
  } catch {
    res.status(400).json({ success: false, error: 'Invalid Base64 string.' });
  }
});

// ─── UUID ─────────────────────────────────────────────────────────────────────
router.get('/uuid', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 1, 10);
  const uuids = Array.from({ length: count }, () => uuidv4());
  res.json({ success: true, data: { uuids, count } });
});

// ─── Password Generator ───────────────────────────────────────────────────────
router.post('/password', (req, res) => {
  const length  = Math.min(Math.max(parseInt(req.body.length) || 16, 8), 128);
  const symbols = req.body.symbols !== 'false' && req.body.symbols !== false;

  const lower   = 'abcdefghijklmnopqrstuvwxyz';
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits  = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  let charset = lower + upper + digits;
  if (symbols) charset += special;

  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }

  // Strength score
  let strength = 0;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  res.json({
    success: true,
    data: { password, length, symbols, strength: strengthLabel },
  });
});

// ─── Slugify ──────────────────────────────────────────────────────────────────
router.post('/slugify', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const slug = String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
  res.json({ success: true, data: { slug, original: text } });
});

// ─── Text Analyzer ────────────────────────────────────────────────────────────
router.post('/text/analyze', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const t         = String(text);
  const words     = t.trim() === '' ? 0 : t.trim().split(/\s+/).length;
  const chars     = t.length;
  const noSpaces  = t.replace(/\s/g, '').length;
  const sentences = (t.match(/[.!?]+/g) || []).length;
  const paragraphs= t.split(/\n{2,}/).filter(p => p.trim()).length || 1;
  const readMins  = Math.ceil(words / 200);

  res.json({
    success: true,
    data: {
      words, characters: chars, characters_no_spaces: noSpaces,
      sentences, paragraphs, reading_time_minutes: readMins,
    },
  });
});

// ─── IP Lookup ────────────────────────────────────────────────────────────────
router.get('/ip', async (req, res) => {
  const ip = req.query.ip || req.ip || '8.8.8.8';
  const cleanIp = ip.replace(/^::ffff:/, '');
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${cleanIp}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, { timeout: 5000 });
    if (data.status !== 'success') {
      return res.status(400).json({ success: false, error: data.message || 'IP lookup failed.' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, error: 'IP lookup service unavailable.' });
  }
});

module.exports = router;
