/**
 * /api/v1/crypto — Cryptocurrency & Blockchain
 *
 * GET /api/v1/crypto/price?coin=bitcoin&currency=usd
 * GET /api/v1/crypto/top?limit=10&currency=usd
 * GET /api/v1/crypto/history?coin=bitcoin&days=7
 * GET /api/v1/crypto/convert?amount=1&from=bitcoin&to=ngn
 * GET /api/v1/crypto/gas
 * GET /api/v1/crypto/search?q=solana
 *
 * Powered by CoinGecko public API — free, no key needed (30 req/min)
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const CG = 'https://api.coingecko.com/api/v3';
const fail = (res, msg, code = 500) => res.status(code).json({ success: false, error: msg });

/* ── GET /price?coin=bitcoin&currency=usd,ngn ── */
router.get('/price', async (req, res) => {
  const { coin = 'bitcoin', currency = 'usd,ngn' } = req.query;
  try {
    const { data } = await axios.get(`${CG}/simple/price`, {
      params: { ids: coin.toLowerCase(), vs_currencies: currency, include_24hr_change: true, include_market_cap: true, include_24hr_vol: true },
      timeout: 10000,
    });
    if (!data || !data[coin.toLowerCase()]) return fail(res, `Coin "${coin}" not found. Use /crypto/search to find the correct ID.`);
    const d = data[coin.toLowerCase()];
    const currencies = {};
    currency.split(',').forEach(c => {
      c = c.trim().toLowerCase();
      if (d[c] !== undefined) currencies[c] = { price: d[c], change_24h: d[`${c}_24h_change`] ?? null, market_cap: d[`${c}_market_cap`] ?? null, volume_24h: d[`${c}_24h_vol`] ?? null };
    });
    res.json({ success: true, coin: coin.toLowerCase(), currencies });
  } catch (e) {
    if (e.response?.status === 429) return fail(res, 'Rate limit hit — CoinGecko allows 30 requests/min on the free tier. Try again shortly.', 429);
    fail(res, 'Crypto price fetch failed: ' + e.message);
  }
});

/* ── GET /top?limit=10&currency=usd ── */
router.get('/top', async (req, res) => {
  const { limit = 10, currency = 'usd' } = req.query;
  const n = Math.min(parseInt(limit) || 10, 50);
  try {
    const { data } = await axios.get(`${CG}/coins/markets`, {
      params: { vs_currency: currency.toLowerCase(), order: 'market_cap_desc', per_page: n, page: 1, sparkline: false, price_change_percentage: '24h' },
      timeout: 10000,
    });
    res.json({
      success: true, currency: currency.toLowerCase(), count: data.length,
      coins: data.map(c => ({
        rank: c.market_cap_rank, id: c.id, name: c.name, symbol: c.symbol.toUpperCase(),
        price: c.current_price, change_24h: c.price_change_percentage_24h,
        market_cap: c.market_cap, volume_24h: c.total_volume,
        high_24h: c.high_24h, low_24h: c.low_24h, image: c.image,
      })),
    });
  } catch (e) {
    if (e.response?.status === 429) return fail(res, 'Rate limit hit — try again shortly.', 429);
    fail(res, 'Failed to fetch top coins: ' + e.message);
  }
});

/* ── GET /history?coin=bitcoin&days=7 ── */
router.get('/history', async (req, res) => {
  const { coin = 'bitcoin', days = 7, currency = 'usd' } = req.query;
  const d = Math.min(parseInt(days) || 7, 365);
  try {
    const { data } = await axios.get(`${CG}/coins/${coin.toLowerCase()}/market_chart`, {
      params: { vs_currency: currency.toLowerCase(), days: d, interval: d <= 1 ? 'hourly' : 'daily' },
      timeout: 12000,
    });
    res.json({
      success: true, coin: coin.toLowerCase(), currency: currency.toLowerCase(), days: d,
      prices: data.prices.map(([ts, price]) => ({ date: new Date(ts).toISOString().split('T')[0], timestamp: ts, price })),
    });
  } catch (e) {
    if (e.response?.status === 404) return fail(res, `Coin "${coin}" not found.`);
    if (e.response?.status === 429) return fail(res, 'Rate limit hit — try again shortly.', 429);
    fail(res, 'History fetch failed: ' + e.message);
  }
});

/* ── GET /convert?amount=100&from=bitcoin&to=ngn ── */
router.get('/convert', async (req, res) => {
  const { amount = 1, from = 'bitcoin', to = 'usd' } = req.query;
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return fail(res, 'amount must be a positive number', 400);
  try {
    const { data } = await axios.get(`${CG}/simple/price`, {
      params: { ids: from.toLowerCase(), vs_currencies: to.toLowerCase() },
      timeout: 8000,
    });
    if (!data[from.toLowerCase()]) return fail(res, `Coin "${from}" not found.`);
    const rate = data[from.toLowerCase()][to.toLowerCase()];
    if (rate === undefined) return fail(res, `Currency "${to}" not supported.`);
    res.json({ success: true, from: from.toLowerCase(), to: to.toLowerCase(), amount: amt, rate, result: amt * rate, result_formatted: (amt * rate).toLocaleString() });
  } catch (e) {
    fail(res, 'Conversion failed: ' + e.message);
  }
});

/* ── GET /gas — Ethereum gas fees ── */
router.get('/gas', async (req, res) => {
  try {
    // Etherscan public endpoint — no key for basic gas oracle
    const { data } = await axios.get('https://api.etherscan.io/api', {
      params: { module: 'gastracker', action: 'gasoracle' },
      timeout: 8000,
    });
    if (data.status !== '1') throw new Error('Gas oracle unavailable');
    const r = data.result;
    res.json({
      success: true,
      network: 'Ethereum Mainnet',
      unit: 'Gwei',
      slow:     { gwei: r.SafeGasPrice,     label: 'Safe / Slow (~10 min)' },
      standard: { gwei: r.ProposeGasPrice,  label: 'Standard (~3 min)' },
      fast:     { gwei: r.FastGasPrice,     label: 'Fast (~30 sec)' },
      base_fee: r.suggestBaseFee || null,
      updated:  new Date().toISOString(),
    });
  } catch (e) {
    fail(res, 'Gas fetch failed: ' + e.message);
  }
});

/* ── GET /search?q=solana ── */
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return fail(res, 'q is required', 400);
  try {
    const { data } = await axios.get(`${CG}/search`, { params: { query: q }, timeout: 8000 });
    res.json({
      success: true, query: q,
      coins: (data.coins || []).slice(0, 10).map(c => ({ id: c.id, name: c.name, symbol: c.symbol, market_cap_rank: c.market_cap_rank || null, thumb: c.thumb })),
    });
  } catch (e) {
    fail(res, 'Search failed: ' + e.message);
  }
});

module.exports = router;
