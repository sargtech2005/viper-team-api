const { query } = require('../config/db');

const PLAN_LIMITS = {
  Free:    { api_limit: 500,    rate_per_min: 5  },
  Starter: { api_limit: 5000,   rate_per_min: 20 },
  Pro:     { api_limit: 25000,  rate_per_min: 60 },
  Ultra:   { api_limit: 100000, rate_per_min: 200 },
};

// Simple in-memory rate tracker (resets per minute)
const rateTracker = new Map();
setInterval(() => rateTracker.clear(), 60 * 1000);

const apiKeyCheck = async (req, res, next) => {
  const start = Date.now();

  // Accept key from Authorization header (Bearer) OR ?apikey= query
  let key = null;
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) {
    key = auth.slice(7).trim();
  } else if (req.query.apikey) {
    key = req.query.apikey.trim();
  }

  if (!key) {
    return res.status(401).json({
      success: false,
      error: 'API key required. Pass via Authorization: Bearer YOUR_KEY or ?apikey=YOUR_KEY',
    });
  }

  try {
    // Look up key + user + plan in one query
    const result = await query(
      `SELECT ak.id as key_id, ak.is_active as key_active,
              u.id as user_id, u.is_active as user_active,
              u.api_calls_used,
              p.name as plan_name, p.api_limit, p.rate_per_min
       FROM api_keys ak
       JOIN users u ON u.id = ak.user_id
       LEFT JOIN plans p ON p.id = u.plan_id
       WHERE ak.key_value = $1`,
      [key]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, error: 'Invalid API key.' });
    }

    const r = result.rows[0];

    if (!r.key_active) {
      return res.status(401).json({ success: false, error: 'This API key has been deactivated.' });
    }
    if (!r.user_active) {
      return res.status(403).json({ success: false, error: 'Account suspended. Contact support.' });
    }

    // Monthly usage limit
    const planLimit = r.api_limit || PLAN_LIMITS[r.plan_name]?.api_limit || 500;
    if (r.api_calls_used >= planLimit) {
      return res.status(429).json({
        success: false,
        error: `Monthly limit reached (${planLimit} calls). Upgrade your plan at https://viper-api.name.ng/pricing`,
        limit: planLimit,
        used: r.api_calls_used,
      });
    }

    // Per-minute rate limit
    const rateLimit   = r.rate_per_min || PLAN_LIMITS[r.plan_name]?.rate_per_min || 5;
    const trackerKey  = `${r.user_id}`;
    const currentRate = rateTracker.get(trackerKey) || 0;
    if (currentRate >= rateLimit) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Your plan allows ${rateLimit} requests/minute.`,
        rate_limit: rateLimit,
      });
    }
    rateTracker.set(trackerKey, currentRate + 1);

    // Attach to request
    req.apiUser = {
      userId:    r.user_id,
      keyId:     r.key_id,
      planName:  r.plan_name || 'Free',
      apiLimit:  planLimit,
      callsUsed: r.api_calls_used,
    };

    // After response: increment usage + log
    res.on('finish', async () => {
      const duration = Date.now() - start;
      try {
        await query('UPDATE users SET api_calls_used = api_calls_used + 1 WHERE id = $1', [r.user_id]);
        await query('UPDATE api_keys SET last_used = NOW() WHERE id = $1', [r.key_id]);
        await query(
          `INSERT INTO api_logs (user_id, api_key_id, endpoint, method, status_code, duration_ms, ip_address)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [r.user_id, r.key_id, req.path, req.method, res.statusCode, duration, req.ip]
        );
      } catch (_) {}
    });

    next();
  } catch (err) {
    console.error('apiKeyCheck error:', err);
    res.status(500).json({ success: false, error: 'Authentication error.' });
  }
};

module.exports = apiKeyCheck;
