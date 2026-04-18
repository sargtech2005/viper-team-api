/**
 * Platform settings — stored in the `settings` DB table.
 * Falls back to process.env if a key is not found in the DB.
 * Results are cached in-memory for 30 seconds to avoid per-request DB hits.
 */

const { query } = require('./db');

const _cache = {};   // { key: { val, ts } }
const TTL    = 30_000; // 30 s

async function getSetting(key, fallback = '') {
  const now = Date.now();
  if (_cache[key] && now - _cache[key].ts < TTL) return _cache[key].val;
  try {
    const r   = await query('SELECT value FROM settings WHERE key = $1', [key]);
    const val = r.rows[0]?.value || process.env[key] || fallback;
    _cache[key] = { val, ts: now };
    return val;
  } catch {
    return process.env[key] || fallback;
  }
}

async function setSetting(key, value) {
  await query(
    `INSERT INTO settings(key, value, updated_at) VALUES($1, $2, NOW())
     ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
  _cache[key] = { val: value, ts: Date.now() };
}

/** Bust cache for a single key (useful after update) */
function bustCache(key) {
  delete _cache[key];
}

module.exports = { getSetting, setSetting, bustCache };
