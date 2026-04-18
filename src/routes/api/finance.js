const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// ─── Naira to USD / live rate helper ─────────────────────────────────────────
async function getRate(from, to) {
  const { data } = await axios.get(`https://open.er-api.com/v6/latest/${from}`, { timeout: 5000 });
  if (data.result === 'error') throw new Error(data['error-type']);
  return data.rates[to];
}

// ─── Currency Convert ─────────────────────────────────────────────────────────
router.get('/convert', async (req, res) => {
  const { amount, from = 'USD', to = 'NGN' } = req.query;
  const v = parseFloat(amount);
  if (isNaN(v)) return res.status(400).json({ success: false, error: '`amount` must be a number.' });
  try {
    const rate   = await getRate(from.toUpperCase(), to.toUpperCase());
    const result = Math.round(v * rate * 100) / 100;
    res.json({ success: true, data: { amount: v, from: from.toUpperCase(), to: to.toUpperCase(), rate, result, formatted: `${to.toUpperCase()} ${result.toLocaleString()}` } });
  } catch (e) {
    res.status(502).json({ success: false, error: 'Exchange rate service unavailable.' });
  }
});

// ─── Loan / EMI Calculator ────────────────────────────────────────────────────
router.get('/loan', (req, res) => {
  const principal = parseFloat(req.query.principal);
  const rate      = parseFloat(req.query.rate);      // annual interest %
  const months    = parseInt(req.query.months);

  if (isNaN(principal) || isNaN(rate) || isNaN(months) || principal<=0 || rate<0 || months<=0) {
    return res.status(400).json({ success: false, error: '`principal`, `rate` (annual %), and `months` are required positive numbers.' });
  }

  const r = rate / 100 / 12; // monthly rate
  let monthly, total_interest;

  if (r === 0) {
    monthly = principal / months;
    total_interest = 0;
  } else {
    monthly = principal * r * Math.pow(1+r,months) / (Math.pow(1+r,months)-1);
    total_interest = (monthly * months) - principal;
  }

  res.json({ success: true, data: {
    principal: Math.round(principal),
    annual_rate_pct: rate,
    months,
    monthly_payment:  Math.round(monthly*100)/100,
    total_payment:    Math.round(monthly*months*100)/100,
    total_interest:   Math.round(total_interest*100)/100,
  }});
});

// ─── Compound Interest ────────────────────────────────────────────────────────
router.get('/compound', (req, res) => {
  const p = parseFloat(req.query.principal);
  const r = parseFloat(req.query.rate);       // annual %
  const t = parseFloat(req.query.years);
  const n = parseInt(req.query.times) || 12;  // compounds per year

  if (isNaN(p)||isNaN(r)||isNaN(t)||p<=0||r<0||t<=0) {
    return res.status(400).json({ success: false, error: '`principal`, `rate` (annual %), and `years` are required.' });
  }

  const amount   = p * Math.pow(1 + (r/100)/n, n*t);
  const interest = amount - p;

  res.json({ success: true, data: {
    principal:      Math.round(p*100)/100,
    rate_pct:       r,
    years:          t,
    compounds_per_year: n,
    final_amount:   Math.round(amount*100)/100,
    interest_earned:Math.round(interest*100)/100,
    multiplier:     Math.round((amount/p)*1000)/1000,
  }});
});

// ─── VAT Calculator ───────────────────────────────────────────────────────────
router.get('/vat', (req, res) => {
  const amount = parseFloat(req.query.amount);
  const rate   = parseFloat(req.query.rate) || 7.5; // Nigeria VAT default 7.5%
  const mode   = req.query.mode || 'add'; // add | remove

  if (isNaN(amount) || amount < 0) return res.status(400).json({ success: false, error: '`amount` is required.' });

  let net, vat, gross;
  if (mode === 'remove') {
    gross = amount;
    net   = amount / (1 + rate/100);
    vat   = gross - net;
  } else {
    net   = amount;
    vat   = amount * (rate/100);
    gross = net + vat;
  }

  res.json({ success: true, data: {
    mode,
    vat_rate_pct: rate,
    net:          Math.round(net*100)/100,
    vat:          Math.round(vat*100)/100,
    gross:        Math.round(gross*100)/100,
  }});
});

// ─── Tip Calculator ───────────────────────────────────────────────────────────
router.get('/tip', (req, res) => {
  const bill    = parseFloat(req.query.bill);
  const pct     = parseFloat(req.query.tip) || 10;
  const people  = Math.max(1, parseInt(req.query.people) || 1);

  if (isNaN(bill) || bill < 0) return res.status(400).json({ success: false, error: '`bill` amount is required.' });

  const tip_amount   = bill * pct / 100;
  const total        = bill + tip_amount;
  const per_person   = total / people;

  res.json({ success: true, data: {
    bill, tip_pct: pct, people,
    tip_amount:  Math.round(tip_amount*100)/100,
    total:       Math.round(total*100)/100,
    per_person:  Math.round(per_person*100)/100,
  }});
});

// ─── Discount Calculator ──────────────────────────────────────────────────────
router.get('/discount', (req, res) => {
  const price    = parseFloat(req.query.price);
  const discount = parseFloat(req.query.discount); // % or flat
  const type     = req.query.type || 'percent'; // percent | flat

  if (isNaN(price)||isNaN(discount)||price<0||discount<0) {
    return res.status(400).json({ success: false, error: '`price` and `discount` are required.' });
  }

  const saving = type === 'flat' ? discount : price * discount / 100;
  const final  = Math.max(0, price - saving);

  res.json({ success: true, data: {
    original_price:  Math.round(price*100)/100,
    discount_type:   type,
    discount_value:  discount,
    saving:          Math.round(saving*100)/100,
    final_price:     Math.round(final*100)/100,
    savings_pct:     Math.round(saving/price*10000)/100,
  }});
});

module.exports = router;
