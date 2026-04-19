const express = require('express');
const router  = express.Router();

// ─── Email Validation ─────────────────────────────────────────────────────────
router.post('/email', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: '`email` is required.' });
  const e = String(email).trim().toLowerCase();
  const valid = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e);
  const parts = e.split('@');
  const domain = parts[1] || '';
  const disposable_domains = ['mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com','sharklasers.com','guerrillamailblock.com','grr.la','spam4.me','trashmail.com'];
  const is_disposable = disposable_domains.includes(domain);
  res.json({ success: true, data: { email: e, valid, is_disposable, domain, local_part: parts[0] || '' } });
});

// ─── URL Validation ───────────────────────────────────────────────────────────
router.post('/url', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: '`url` is required.' });
  try {
    const u = new URL(String(url));
    res.json({ success: true, data: { valid: true, url: u.href, protocol: u.protocol, hostname: u.hostname, pathname: u.pathname, port: u.port || null, params: Object.fromEntries(u.searchParams) } });
  } catch {
    res.json({ success: true, data: { valid: false, url, error: 'Invalid URL format' } });
  }
});

// ─── Phone Number Validation ──────────────────────────────────────────────────
router.post('/phone', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: '`phone` is required.' });
  const p = String(phone).replace(/[\s\-().]/g, '');
  const is_valid = /^\+?[1-9]\d{6,14}$/.test(p);
  const has_country_code = p.startsWith('+');
  const nigeria = /^(\+234|0)[789][01]\d{8}$/.test(phone.replace(/\s/g,''));
  res.json({ success: true, data: { phone, valid: is_valid, has_country_code, is_nigerian_number: nigeria, cleaned: p } });
});

// ─── Credit Card Validator (Luhn) ─────────────────────────────────────────────
router.post('/credit-card', (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ success: false, error: '`number` is required.' });
  const n = String(number).replace(/\D/g, '');
  let sum = 0, alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  const valid = n.length >= 13 && sum % 10 === 0;
  const type =
    /^4/.test(n)       ? 'Visa' :
    /^5[1-5]/.test(n)  ? 'Mastercard' :
    /^3[47]/.test(n)   ? 'Amex' :
    /^6011/.test(n)    ? 'Discover' : 'Unknown';
  res.json({ success: true, data: { valid, type, length: n.length, masked: n.slice(0,-4).replace(/./g,'*')+n.slice(-4) } });
});

// ─── Password Strength ────────────────────────────────────────────────────────
router.post('/password-strength', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, error: '`password` is required.' });
  const p = String(password);
  const checks = {
    length_8:   p.length >= 8,
    length_12:  p.length >= 12,
    has_lower:  /[a-z]/.test(p),
    has_upper:  /[A-Z]/.test(p),
    has_number: /[0-9]/.test(p),
    has_symbol: /[^a-zA-Z0-9]/.test(p),
    no_spaces:  !/\s/.test(p),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const strength = score <= 2 ? 'Very Weak' : score <= 3 ? 'Weak' : score <= 5 ? 'Fair' : score === 6 ? 'Strong' : 'Very Strong';
  const suggestions = [];
  if (!checks.length_8)   suggestions.push('Use at least 8 characters');
  if (!checks.length_12)  suggestions.push('Use 12+ characters for better security');
  if (!checks.has_upper)  suggestions.push('Add uppercase letters');
  if (!checks.has_number) suggestions.push('Add numbers');
  if (!checks.has_symbol) suggestions.push('Add special characters (!@#$...)');
  res.json({ success: true, data: { strength, score, max_score: 7, checks, suggestions } });
});

// ─── Color Validator ──────────────────────────────────────────────────────────
router.post('/color', (req, res) => {
  const { color } = req.body;
  if (!color) return res.status(400).json({ success: false, error: '`color` is required.' });
  const c = String(color).trim();

  // HEX
  const hexMatch = c.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split('').map(x => x+x).join('');
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    return res.json({ success: true, data: { valid: true, format: 'hex', hex: '#'+hex.toUpperCase(), rgb: {r,g,b}, hsl: rgbToHsl(r,g,b) } });
  }
  // RGB
  const rgbMatch = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (rgbMatch) {
    const r = +rgbMatch[1], g = +rgbMatch[2], b = +rgbMatch[3];
    if ([r,g,b].some(v => v > 255)) return res.json({ success: true, data: { valid: false, error: 'RGB values must be 0-255' } });
    const hex = ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1).toUpperCase();
    return res.json({ success: true, data: { valid: true, format: 'rgb', hex: '#'+hex, rgb: {r,g,b}, hsl: rgbToHsl(r,g,b) } });
  }
  res.json({ success: true, data: { valid: false, color: c, error: 'Unrecognised format. Use hex (#rrggbb) or rgb(r,g,b)' } });
});

function rgbToHsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s, l=(max+min)/2;
  if (max===min) { h=s=0; } else {
    const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
    h = max===r?(g-b)/d+(g<b?6:0) : max===g?(b-r)/d+2 : (r-g)/d+4;
    h /= 6;
  }
  return { h:Math.round(h*360), s:Math.round(s*100), l:Math.round(l*100) };
}

// ─── JSON Validator ───────────────────────────────────────────────────────────
router.post('/json', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  try {
    const parsed = JSON.parse(String(text));
    const type = Array.isArray(parsed) ? 'array' : typeof parsed;
    const keys = type === 'object' && parsed !== null ? Object.keys(parsed).length : null;
    res.json({ success: true, data: { valid: true, type, keys, length: Array.isArray(parsed) ? parsed.length : null } });
  } catch (e) {
    res.json({ success: true, data: { valid: false, error: e.message } });
  }
});

// ─── Nigerian BVN/NIN format check ────────────────────────────────────────────
router.post('/nin', (req, res) => {
  const { nin } = req.body;
  if (!nin) return res.status(400).json({ success: false, error: '`nin` is required.' });
  const n = String(nin).replace(/\s/g, '');
  const valid = /^\d{11}$/.test(n);
  res.json({ success: true, data: { valid, nin: n, format: '11-digit numeric' } });
});

router.post('/bvn', (req, res) => {
  const { bvn } = req.body;
  if (!bvn) return res.status(400).json({ success: false, error: '`bvn` is required.' });
  const n = String(bvn).replace(/\s/g, '');
  const valid = /^\d{11}$/.test(n);
  res.json({ success: true, data: { valid, bvn: n, format: '11-digit numeric' } });
});

// ─── Disposable Email Check ───────────────────────────────────────────────────
router.post('/disposable', async (req, res) => {
  const axios = require('axios');
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'email is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Invalid email format' });

  const domain = email.split('@')[1].toLowerCase();
  const SAFE = ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','protonmail.com','live.com','me.com'];
  if (SAFE.includes(domain)) {
    return res.json({ success: true, email, domain, disposable: false, source: 'safe-list', advice: 'Recognised trusted email provider.' });
  }

  try {
    const { data } = await axios.get(`https://open.kickbox.com/v1/disposable/${domain}`, { timeout: 8000 });
    res.json({ success: true, email, domain, disposable: data.disposable, source: 'kickbox',
      advice: data.disposable ? 'This domain is associated with disposable/temporary email providers.' : 'Domain not found in disposable email lists.' });
  } catch {
    try {
      const { data: list } = await axios.get('https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf', { timeout: 8000 });
      const disposable = list.split('\n').map(d => d.trim().toLowerCase()).includes(domain);
      res.json({ success: true, email, domain, disposable, source: 'blocklist' });
    } catch (e2) {
      res.status(500).json({ success: false, error: 'Disposable check unavailable: ' + e2.message });
    }
  }
});

// ─── Phone Lookup ─────────────────────────────────────────────────────────────
// Full carrier + line-type lookup using libphonenumber-js (local, no API key)
// npm install libphonenumber-js
router.post('/phone-lookup', (req, res) => {
  const { phone, country = 'NG' } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });

  let parsePhoneNumber;
  try { ({ parsePhoneNumber } = require('libphonenumber-js')); }
  catch { return res.status(503).json({ success: false, error: 'libphonenumber-js not installed. Run: npm install libphonenumber-js' }); }

  try {
    const parsed = parsePhoneNumber(String(phone), country.toUpperCase());
    if (!parsed) return res.status(400).json({ success: false, error: 'Could not parse phone number' });

    // Nigerian carrier prefix map
    const NG = {
      '0701':'Airtel','0708':'Airtel','0802':'Airtel','0808':'Airtel','0812':'Airtel','0901':'Airtel','0902':'Airtel','0907':'Airtel','0912':'Airtel',
      '0703':'MTN',   '0706':'MTN',   '0803':'MTN',   '0806':'MTN',   '0810':'MTN',   '0813':'MTN',   '0814':'MTN',   '0816':'MTN',   '0903':'MTN',   '0906':'MTN',
      '0705':'Glo',   '0805':'Glo',   '0807':'Glo',   '0811':'Glo',   '0815':'Glo',   '0905':'Glo',
      '0704':'9mobile','0809':'9mobile','0817':'9mobile','0818':'9mobile','0909':'9mobile','0908':'9mobile',
    };

    let carrier = null;
    if (parsed.country === 'NG') {
      const prefix = '0' + parsed.nationalNumber.slice(0, 3);
      carrier = NG[prefix] || null;
    }

    res.json({
      success:         true,
      valid:           parsed.isValid(),
      number:          parsed.number,
      international:   parsed.formatInternational(),
      national:        parsed.formatNational(),
      e164:            parsed.format('E.164'),
      country:         parsed.country,
      country_code:    '+' + parsed.countryCallingCode,
      national_number: parsed.nationalNumber,
      carrier,
      line_type:       carrier ? 'mobile' : 'unknown',
      possible:        parsed.isPossible(),
    });
  } catch (e) {
    res.status(400).json({ success: false, error: 'Parse error: ' + e.message });
  }
});

module.exports = router;
