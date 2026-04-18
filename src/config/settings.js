/**
 * Platform settings — stored in the `settings` DB table.
 * Falls back to process.env if a key is not found in the DB.
 * Results are cached in-memory for 30 seconds to avoid per-request DB hits.
 *
 * The table is auto-created on first use — no manual migration required.
 */

const { query } = require('./db');

const _cache   = {};        // { key: { val, ts } }
const TTL      = 30_000;    // 30 s
let   _tableOk = false;     // set true once CREATE IF NOT EXISTS has run

async function ensureTable() {
  if (_tableOk) return;
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key        VARCHAR(100) PRIMARY KEY,
      value      TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  _tableOk = true;
}

async function getSetting(key, fallback = '') {
  const now = Date.now();
  if (_cache[key] && now - _cache[key].ts < TTL) return _cache[key].val;
  try {
    await ensureTable();
    const r   = await query('SELECT value FROM settings WHERE key = $1', [key]);
    const val = r.rows[0]?.value || process.env[key] || fallback;
    _cache[key] = { val, ts: now };
    return val;
  } catch {
    return process.env[key] || fallback;
  }
}

async function setSetting(key, value) {
  await ensureTable();
  await query(
    `INSERT INTO settings(key, value, updated_at) VALUES($1, $2, NOW())
     ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
  _cache[key] = { val: value, ts: Date.now() };
}

function bustCache(key) {
  delete _cache[key];
}

module.exports = { getSetting, setSetting, bustCache };
