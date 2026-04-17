const router = require('express').Router();
const axios  = require('axios');
const { query } = require('../db');

// Plan credit limits
const PLAN_LIMITS = {
  free:     5,
  starter:  150,
  basic:    300,
  pro:      500,
  business: 800,
};

// Extract API key from request (header or query param)
function extractApiKey(req) {
  return (
    req.headers['x-api-key'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.query.apiKey ||
    req.query.api_key
  );
}

// ── Middleware: validate API key + credits ────────────────────────────────────
async function gatewayAuth(req, res, next) {
  const apiKey = extractApiKey(req);
  if (!apiKey) return res.status(401).json({ error: 'API key required. Pass X-API-Key header or ?apiKey=' });

  const { rows } = await query(
    'SELECT id, plan, credits_remaining, credits_used, is_active, credits_reset_at FROM users WHERE api_key = $1',
    [apiKey]
  );
  const user = rows[0];

  if (!user) return res.status(401).json({ error: 'Invalid API key' });
  if (!user.is_active) return res.status(403).json({ error: 'Account suspended' });

  // Auto-reset monthly credits if period expired
  if (new Date(user.credits_reset_at) < new Date()) {
    const limit = PLAN_LIMITS[user.plan] || 5;
    const newReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      'UPDATE users SET credits_remaining = $1, credits_used = 0, credits_reset_at = $2 WHERE id = $3',
      [limit, newReset, user.id]
    );
    user.credits_remaining = limit;
  }

  if (user.credits_remaining <= 0) {
    return res.status(429).json({
      error: 'Credit limit reached',
      message: 'Your monthly credits are exhausted. Buy a top-up pack or upgrade your plan.',
      plan: user.plan,
      credits_remaining: 0,
    });
  }

  req.apiUser = user;
  next();
}

// ── Main Gateway Handler ──────────────────────────────────────────────────────
router.all('/:category/:endpoint', gatewayAuth, async (req, res) => {
  const { category, endpoint } = req.params;
  const start = Date.now();

  try {
    // Look up endpoint config
    const { rows } = await query(
      `SELECT e.*, c.slug AS cat_slug FROM api_endpoints e
       JOIN api_categories c ON c.id = e.category_id
       WHERE c.slug = $1 AND e.slug = $2 AND e.is_active = true`,
      [category, endpoint]
    );
    const ep = rows[0];

    if (!ep) {
      return res.status(404).json({
        error: 'Endpoint not found',
        hint: `No active endpoint /${category}/${endpoint}`,
      });
    }

    // Deduct 1 credit
    await query(
      'UPDATE users SET credits_remaining = credits_remaining - 1, credits_used = credits_used + 1 WHERE id = $1',
      [req.apiUser.id]
    );

    let responseData;
    let statusCode = 200;

    if (ep.proxy_url) {
      // Proxy to actual API
      const queryParams = { ...req.query };
      delete queryParams.apiKey;
      delete queryParams.api_key;

      const proxyRes = await axios({
        method: ep.method || 'GET',
        url: ep.proxy_url,
        params: req.method === 'GET' ? queryParams : undefined,
        data:   req.method !== 'GET' ? req.body : undefined,
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });
      responseData = proxyRes.data;
      statusCode   = proxyRes.status;
    } else {
      // Stub response (endpoint not yet wired)
      responseData = {
        success: true,
        message: `${ep.name} endpoint is available but not yet configured.`,
        endpoint: `${category}/${endpoint}`,
      };
    }

    const latency = Date.now() - start;

    // Log the call (non-blocking)
    query(
      'INSERT INTO api_logs (user_id, category, endpoint, method, status_code, latency_ms, ip) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [req.apiUser.id, category, endpoint, req.method, statusCode, latency, req.ip]
    ).catch(console.error);

    res.set('X-Credits-Remaining', req.apiUser.credits_remaining - 1);
    res.set('X-Latency-Ms', latency);
    res.status(statusCode).json(responseData);

  } catch (err) {
    const latency = Date.now() - start;
    query(
      'INSERT INTO api_logs (user_id, category, endpoint, method, status_code, latency_ms, ip) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [req.apiUser.id, category, endpoint, req.method, 500, latency, req.ip]
    ).catch(console.error);

    console.error('Gateway error:', err.message);
    res.status(502).json({ error: 'Upstream API error', detail: err.message });
  }
});

module.exports = router;
