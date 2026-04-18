const { query } = require('../config/db');

const PLAN_LIMITS = {
  Free:    { api_limit: 500,    rate_per_min: 10  },
  Hobby:   { api_limit: 4000,   rate_per_min: 30  },
  Starter: { api_limit: 25000,  rate_per_min: 120 },
  Pro:     { api_limit: 100000, rate_per_min: 400 },
};

// Simple in-memory rate tracker (resets per minute)
const rateTracker = new Map();
setInterval(() => rateTracker.clear(), 60 * 1000);

const apiKeyCheck = async (req, res, next) => {
  const start = Date.now();

  // Accept key from Authorization header (Bearer) OR ?apikey= query
  let key = null;
  const xApiKey = req.headers['x-api-key'] || '';
  const auth    = req.headers['authorization'] || '';
  if (xApiKey) {
    key = xApiKey.trim();
  } else if (auth.startsWith('Bearer ')) {
    key = auth.slice(7).trim();
  } else if (req.query.apikey || req.query.key) {
    key = (req.query.apikey || req.query.key).trim();
  }

  if (!key) {
    return res.status(401).json({
      success: false,
      error: 'API key required. Pass via Authorization: Bearer YOUR_KEY or ?apikey=YOUR_KEY',
    });
  }

  try {
    // Look up key + user + plan in one query (include credit_balance)
    const result = await query(
      `SELECT ak.id as key_id, ak.is_active as key_active,
              u.id as user_id, u.is_active as user_active,
              u.api_calls_used, u.credit_balance,
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
    const overPlanLimit = r.api_calls_used >= planLimit;

    if (overPlanLimit) {
      // ── Auto-dip: use a credit if the user has any ──────────────────────
      const creditBal = r.credit_balance || 0;
      if (creditBal > 0) {
        // Deduct 1 credit atomically (prevent race to below 0)
        const creditResult = await query(
          `UPDATE users
           SET credit_balance = GREATEST(0, credit_balance - 1)
           WHERE id = $1 AND credit_balance > 0
           RETURNING credit_balance`,
          [r.user_id]
        );

        if (!creditResult.rows.length) {
          // Another concurrent request beat us — no credits left
          return res.status(429).json({
            success: false,
            error: `Monthly limit reached (${planLimit} calls) and no credits available. Top up at https://viper-api.name.ng/dashboard/billing`,
            limit: planLimit,
            used: r.api_calls_used,
            credits: 0,
          });
        }

        // Log the credit usage asynchronously
        query(
          `INSERT INTO credit_transactions (user_id, type, amount, description)
           VALUES ($1, 'usage', -1, 'API call overage (auto-dip)')`,
          [r.user_id]
        ).catch(() => {});

        // Attach overage flag so response headers reflect credit usage
        req._usedCredit = true;
        req._creditRemaining = creditResult.rows[0].credit_balance;
      } else {
        // Throttle to 5 req/min instead of hard-blocking (graceful degradation)
        const trackerKey  = `throttle_${r.user_id}`;
        const throttleCount = rateTracker.get(trackerKey) || 0;
        if (throttleCount >= 5) {
          return res.status(429).json({
            success: false,
            error: `Monthly limit reached (${planLimit} calls). Top up credits or upgrade your plan at https://viper-api.name.ng/dashboard/billing`,
            limit: planLimit,
            used: r.api_calls_used,
            credits: 0,
          });
        }
        rateTracker.set(trackerKey, throttleCount + 1);
      }
    }

    // Per-minute rate limit (only apply when not in overage-throttle mode)
    if (!overPlanLimit) {
      const rateLimit   = r.rate_per_min || PLAN_LIMITS[r.plan_name]?.rate_per_min || 10;
      const trackerKey  = `rate_${r.user_id}`;
      const currentRate = rateTracker.get(trackerKey) || 0;
      if (currentRate >= rateLimit) {
        return res.status(429).json({
          success: false,
          error: `Rate limit exceeded. Your plan allows ${rateLimit} requests/minute.`,
          rate_limit: rateLimit,
        });
      }
      rateTracker.set(trackerKey, currentRate + 1);
    }

    // Attach to request
    req.apiUser = {
      userId:    r.user_id,
      keyId:     r.key_id,
      planName:  r.plan_name || 'Free',
      apiLimit:  planLimit,
      callsUsed: r.api_calls_used,
      creditBalance: r.credit_balance || 0,
    };

    // After response: increment usage + log
    res.on('finish', async () => {
      const duration = Date.now() - start;
      try {
        // Only increment plan usage counter when NOT drawing from credits
        if (!req._usedCredit) {
          await query('UPDATE users SET api_calls_used = api_calls_used + 1 WHERE id = $1', [r.user_id]);
        }
        await query('UPDATE api_keys SET last_used = NOW() WHERE id = $1', [r.key_id]);
        await query(
          `INSERT INTO api_logs (user_id, api_key_id, endpoint, method, status_code, duration_ms, ip_address)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [r.user_id, r.key_id, req.path, req.method, res.statusCode, duration, req.ip]
        );
      } catch (_) {}
    });

    // Response headers
    const remaining = Math.max(0, planLimit - r.api_calls_used - 1);
    res.setHeader('X-Quota-Remaining', overPlanLimit ? 0 : remaining);
    res.setHeader('X-Quota-Limit', planLimit);
    res.setHeader('X-Credit-Balance', req._creditRemaining ?? (r.credit_balance || 0));
    if (req._usedCredit) {
      res.setHeader('X-Credit-Used', '1');
    }

    next();
  } catch (err) {
    console.error('apiKeyCheck error:', err);
    res.status(500).json({ success: false, error: 'Authentication error.' });
  }
};

module.exports = apiKeyCheck;
