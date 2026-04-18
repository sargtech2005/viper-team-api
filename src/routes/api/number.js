const express = require('express');
const router  = express.Router();

// ─── Random Number ────────────────────────────────────────────────────────────
router.get('/random', (req, res) => {
  const min   = parseInt(req.query.min) || 1;
  const max   = parseInt(req.query.max) || 100;
  const count = Math.min(Math.max(parseInt(req.query.count) || 1, 1), 100);
  if (min >= max) return res.status(400).json({ success: false, error: '`min` must be less than `max`.' });
  const numbers = Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
  res.json({ success: true, data: { numbers, count, min, max } });
});

// ─── Number to Words ──────────────────────────────────────────────────────────
router.get('/words', (req, res) => {
  const n = parseInt(req.query.n);
  if (isNaN(n)) return res.status(400).json({ success: false, error: '`n` query param (integer) is required.' });
  if (Math.abs(n) > 999999999999) return res.status(400).json({ success: false, error: 'Number too large (max: 999,999,999,999).' });

  const ones  = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens  = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

  function chunk(n) {
    if (n < 20)  return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? '-'+ones[n%10] : '');
    return ones[Math.floor(n/100)] + ' hundred' + (n%100 ? ' '+chunk(n%100) : '');
  }

  if (n === 0) return res.json({ success: true, data: { words: 'zero', number: 0 } });

  let abs = Math.abs(n), parts = [];
  if (abs >= 1e9)  { parts.push(chunk(Math.floor(abs/1e9)) + ' billion');  abs %= 1e9; }
  if (abs >= 1e6)  { parts.push(chunk(Math.floor(abs/1e6)) + ' million');  abs %= 1e6; }
  if (abs >= 1000) { parts.push(chunk(Math.floor(abs/1000)) + ' thousand'); abs %= 1000; }
  if (abs > 0)     { parts.push(chunk(abs)); }

  const words = (n < 0 ? 'negative ' : '') + parts.join(' ');
  res.json({ success: true, data: { words, number: n } });
});

// ─── Roman Numerals ───────────────────────────────────────────────────────────
router.get('/roman', (req, res) => {
  const n = parseInt(req.query.n);
  if (isNaN(n) || n < 1 || n > 3999) return res.status(400).json({ success: false, error: '`n` must be between 1 and 3999.' });
  const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let num = n, roman = '';
  for (const [val, sym] of map) { while (num >= val) { roman += sym; num -= val; } }
  res.json({ success: true, data: { roman, number: n } });
});

// ─── Fibonacci ────────────────────────────────────────────────────────────────
router.get('/fibonacci', (req, res) => {
  const n = Math.min(Math.max(parseInt(req.query.n) || 10, 1), 100);
  const seq = [0, 1];
  for (let i = 2; i < n; i++) seq.push(seq[i-1] + seq[i-2]);
  res.json({ success: true, data: { sequence: seq.slice(0, n), count: n } });
});

// ─── Prime Check ──────────────────────────────────────────────────────────────
router.get('/prime', (req, res) => {
  const n = parseInt(req.query.n);
  if (isNaN(n) || n < 0) return res.status(400).json({ success: false, error: '`n` must be a non-negative integer.' });
  if (n < 2) return res.json({ success: true, data: { is_prime: false, number: n } });
  let prime = true;
  for (let i = 2; i <= Math.sqrt(n); i++) { if (n % i === 0) { prime = false; break; } }
  res.json({ success: true, data: { is_prime: prime, number: n } });
});

// ─── Statistics ───────────────────────────────────────────────────────────────
router.post('/stats', (req, res) => {
  const { numbers } = req.body;
  if (!Array.isArray(numbers) || !numbers.length) return res.status(400).json({ success: false, error: '`numbers` array is required.' });
  const nums = numbers.map(Number).filter(n => !isNaN(n));
  if (!nums.length) return res.status(400).json({ success: false, error: 'No valid numbers found.' });
  const sorted = [...nums].sort((a,b) => a-b);
  const sum    = nums.reduce((a,b) => a+b, 0);
  const mean   = sum / nums.length;
  const mid    = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
  const freq   = {};
  nums.forEach(n => freq[n] = (freq[n]||0)+1);
  const maxF   = Math.max(...Object.values(freq));
  const mode   = Object.keys(freq).filter(k => freq[k]===maxF).map(Number);
  const variance = nums.reduce((a,n) => a + Math.pow(n-mean,2), 0) / nums.length;
  res.json({ success: true, data: {
    count: nums.length, sum: Math.round(sum*1e6)/1e6,
    mean: Math.round(mean*1e6)/1e6, median, mode,
    min: sorted[0], max: sorted[sorted.length-1],
    range: sorted[sorted.length-1] - sorted[0],
    variance: Math.round(variance*1e6)/1e6,
    std_dev: Math.round(Math.sqrt(variance)*1e6)/1e6,
    sorted,
  }});
});

// ─── Unit Converter ───────────────────────────────────────────────────────────
router.get('/convert', (req, res) => {
  const { value, from, to } = req.query;
  if (!value || !from || !to) return res.status(400).json({ success: false, error: '`value`, `from`, and `to` are required.' });
  const v = parseFloat(value);
  if (isNaN(v)) return res.status(400).json({ success: false, error: '`value` must be a number.' });

  // All values relative to base unit (SI)
  const units = {
    // Length (base: meters)
    m:1, km:1000, cm:0.01, mm:0.001, mi:1609.344, yd:0.9144, ft:0.3048, in:0.0254, nm:1e-9,
    // Weight (base: kg)
    kg:1, g:0.001, mg:1e-6, lb:0.453592, oz:0.0283495, t:1000,
    // Temperature — special
    // Speed (base: m/s)
    'ms':1, 'kmh':1/3.6, 'mph':0.44704, 'knot':0.514444,
    // Data (base: bytes)
    b:1, kb:1024, mb:1048576, gb:1073741824, tb:1099511627776,
    // Time (base: seconds)
    s:1, ms_t:0.001, min:60, h:3600, d:86400, wk:604800, yr:31536000,
    // Area (base: m²)
    'm2':1, 'km2':1e6, 'cm2':0.0001, 'ft2':0.092903, 'ac':4046.86, 'ha':10000,
  };

  // Temperature special case
  const tempConv = { c:{ f:v=>v*9/5+32, k:v=>v+273.15 }, f:{ c:v=>(v-32)*5/9, k:v=>(v-32)*5/9+273.15 }, k:{ c:v=>v-273.15, f:v=>(v-273.15)*9/5+32 } };
  if (tempConv[from.toLowerCase()] && tempConv[from.toLowerCase()][to.toLowerCase()]) {
    const result = tempConv[from.toLowerCase()][to.toLowerCase()](v);
    return res.json({ success: true, data: { value: v, from, to, result: Math.round(result*1e6)/1e6 } });
  }

  const fromFactor = units[from.toLowerCase()];
  const toFactor   = units[to.toLowerCase()];
  if (!fromFactor || !toFactor) return res.status(400).json({ success: false, error: `Unknown unit. Supported: ${Object.keys(units).join(', ')}, c/f/k (temp)` });
  const result = v * fromFactor / toFactor;
  res.json({ success: true, data: { value: v, from, to, result: Math.round(result*1e10)/1e10 } });
});

// ─── BMI Calculator ───────────────────────────────────────────────────────────
router.get('/bmi', (req, res) => {
  const weight = parseFloat(req.query.weight); // kg
  const height = parseFloat(req.query.height); // cm
  if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
    return res.status(400).json({ success: false, error: '`weight` (kg) and `height` (cm) are required.' });
  }
  const h = height / 100;
  const bmi = Math.round((weight / (h*h)) * 10) / 10;
  const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese';
  res.json({ success: true, data: { bmi, category, weight_kg: weight, height_cm: height } });
});

module.exports = router;
