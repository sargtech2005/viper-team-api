const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

// ─── Case Converter ────────────────────────────────────────────────────────────
router.post('/case', (req, res) => {
  const { text, to } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const t = String(text);
  const modes = {
    upper:      () => t.toUpperCase(),
    lower:      () => t.toLowerCase(),
    title:      () => t.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
    sentence:   () => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(),
    camel:      () => t.replace(/(?:^\w|[A-Z]|\b\w)/g, (w,i) => i===0?w.toLowerCase():w.toUpperCase()).replace(/\s+/g,''),
    pascal:     () => t.replace(/(?:^\w|[A-Z]|\b\w)/g, w => w.toUpperCase()).replace(/\s+/g,''),
    snake:      () => t.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''),
    kebab:      () => t.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''),
    constant:   () => t.toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,''),
    alternating:() => t.split('').map((c,i) => i%2===0?c.toLowerCase():c.toUpperCase()).join(''),
  };
  const fn = modes[to];
  if (!fn) return res.status(400).json({ success: false, error: `Invalid case. Use: ${Object.keys(modes).join(', ')}` });
  res.json({ success: true, data: { result: fn(), original: text, to } });
});

// ─── Truncate ──────────────────────────────────────────────────────────────────
router.post('/truncate', (req, res) => {
  const { text, length, ellipsis = '...' } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const max = Math.max(1, parseInt(length) || 100);
  const t = String(text);
  const result = t.length <= max ? t : t.slice(0, max).trimEnd() + ellipsis;
  res.json({ success: true, data: { result, original_length: t.length, truncated: t.length > max } });
});

// ─── Reverse ──────────────────────────────────────────────────────────────────
router.post('/reverse', (req, res) => {
  const { text, mode = 'chars' } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const t = String(text);
  let result;
  if (mode === 'words') result = t.split(' ').reverse().join(' ');
  else if (mode === 'lines') result = t.split('\n').reverse().join('\n');
  else result = [...t].reverse().join('');
  res.json({ success: true, data: { result, mode } });
});

// ─── Lorem Ipsum ──────────────────────────────────────────────────────────────
router.get('/lorem', (req, res) => {
  const count  = Math.min(Math.max(parseInt(req.query.count) || 1, 1), 20);
  const type   = req.query.type || 'paragraphs'; // paragraphs | sentences | words

  const words = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate','velit','esse','cillum','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident','sunt','culpa','qui','officia','deserunt','mollit','anim','id','est','laborum'];

  const randWord  = () => words[Math.floor(Math.random() * words.length)];
  const randSent  = () => {
    const len = 8 + Math.floor(Math.random() * 10);
    return Array.from({length:len}, randWord).join(' ').replace(/^./, c => c.toUpperCase()) + '.';
  };
  const randPara  = () => Array.from({length: 4 + Math.floor(Math.random() * 4)}, randSent).join(' ');

  let result;
  if (type === 'words')     result = Array.from({length:count}, randWord).join(' ');
  else if (type === 'sentences') result = Array.from({length:count}, randSent).join(' ');
  else result = Array.from({length:count}, randPara).join('\n\n');

  res.json({ success: true, data: { text: result, type, count } });
});

// ─── Palindrome Check ─────────────────────────────────────────────────────────
router.post('/palindrome', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const clean = String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
  const is_palindrome = clean === [...clean].reverse().join('');
  res.json({ success: true, data: { is_palindrome, text, cleaned: clean } });
});

// ─── Count Occurrences ────────────────────────────────────────────────────────
router.post('/count', (req, res) => {
  const { text, find, case_sensitive = false } = req.body;
  if (!text || !find) return res.status(400).json({ success: false, error: '`text` and `find` are required.' });
  const t = case_sensitive ? String(text) : String(text).toLowerCase();
  const f = case_sensitive ? String(find)  : String(find).toLowerCase();
  let count = 0, pos = 0;
  while ((pos = t.indexOf(f, pos)) !== -1) { count++; pos += f.length; }
  res.json({ success: true, data: { count, find, case_sensitive } });
});

// ─── Remove Duplicates (lines) ────────────────────────────────────────────────
router.post('/dedupe', (req, res) => {
  const { text, case_sensitive = true } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const lines = String(text).split('\n');
  const seen  = new Set();
  const unique = lines.filter(l => {
    const k = case_sensitive ? l : l.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  res.json({ success: true, data: { result: unique.join('\n'), original_lines: lines.length, unique_lines: unique.length, removed: lines.length - unique.length } });
});

// ─── Extract Emails ───────────────────────────────────────────────────────────
router.post('/extract/emails', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const emails = [...new Set(String(text).match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])];
  res.json({ success: true, data: { emails, count: emails.length } });
});

// ─── Extract URLs ─────────────────────────────────────────────────────────────
router.post('/extract/urls', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const urls = [...new Set(String(text).match(/https?:\/\/[^\s"'<>]+/g) || [])];
  res.json({ success: true, data: { urls, count: urls.length } });
});

// ─── Extract Numbers ──────────────────────────────────────────────────────────
router.post('/extract/numbers', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const numbers = (String(text).match(/-?\d+\.?\d*/g) || []).map(Number);
  const sum = numbers.reduce((a,b) => a+b, 0);
  const avg = numbers.length ? sum/numbers.length : 0;
  res.json({ success: true, data: { numbers, count: numbers.length, sum, average: Math.round(avg*1000)/1000, min: numbers.length ? Math.min(...numbers) : null, max: numbers.length ? Math.max(...numbers) : null } });
});

// ─── Hash Generator ───────────────────────────────────────────────────────────
router.post('/hash', (req, res) => {
  const { text, algorithm = 'sha256' } = req.body;
  if (!text) return res.status(400).json({ success: false, error: '`text` is required.' });
  const allowed = ['md5','sha1','sha256','sha512'];
  if (!allowed.includes(algorithm)) return res.status(400).json({ success: false, error: `Algorithm must be one of: ${allowed.join(', ')}` });
  const hash = crypto.createHash(algorithm).update(String(text)).digest('hex');
  res.json({ success: true, data: { hash, algorithm, text } });
});

// ─── Diff Lines ───────────────────────────────────────────────────────────────
router.post('/diff', (req, res) => {
  const { text1, text2 } = req.body;
  if (!text1 || !text2) return res.status(400).json({ success: false, error: '`text1` and `text2` are required.' });
  const a = String(text1).split('\n');
  const b = String(text2).split('\n');
  const added   = b.filter(l => !a.includes(l));
  const removed = a.filter(l => !b.includes(l));
  const same    = a.filter(l => b.includes(l));
  res.json({ success: true, data: { added, removed, unchanged: same, stats: { added: added.length, removed: removed.length, unchanged: same.length } } });
});

// ─── Translate ────────────────────────────────────────────────────────────────
// Uses MyMemory API — free, no key needed, 1000 req/day per IP
// langpair examples: en|es  en|fr  en|yo  en|ha  en|ig  auto|en
router.post('/translate', async (req, res) => {
  const axios = require('axios');
  const { text, from = 'auto', to } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text is required' });
  if (!to)   return res.status(400).json({ success: false, error: 'to (target language code) is required. e.g. "es", "fr", "yo", "ha"' });
  if (text.length > 500) return res.status(400).json({ success: false, error: 'text too long (max 500 chars per request)' });

  try {
    const { data } = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text, langpair: `${from}|${to}`, de: 'viper-api@noreply.com' },
      timeout: 10000,
    });
    if (data.responseStatus !== 200 && data.responseStatus !== '200') {
      return res.status(400).json({ success: false, error: data.responseDetails || 'Translation failed' });
    }
    const t = data.responseData;
    res.json({ success: true, translated: t.translatedText, from, to, match: t.match, original: text });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Translation service error: ' + e.message });
  }
});

module.exports = router;
