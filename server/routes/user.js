const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const makeApiKey = () => 'viper_' + uuid().replace(/-/g, '').slice(0, 32);

// All routes require auth
router.use(authMiddleware);

// ── GET /api/user/profile ─────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, plan, api_key, credits_remaining, credits_used, credits_reset_at, is_admin, email_verified, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
});

// ── PUT /api/user/profile ─────────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await query(
    'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email',
    [name.trim(), req.user.id]
  );
  res.json(rows[0]);
});

// ── POST /api/user/regenerate-key ─────────────────────────────────────────────
router.post('/regenerate-key', async (req, res) => {
  const newKey = makeApiKey();
  await query('UPDATE users SET api_key = $1 WHERE id = $2', [newKey, req.user.id]);
  res.json({ api_key: newKey });
});

// ── GET /api/user/usage ───────────────────────────────────────────────────────
router.get('/usage', async (req, res) => {
  const [statsRes, logsRes] = await Promise.all([
    query(
      'SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status_code < 400) AS success FROM api_logs WHERE user_id = $1',
      [req.user.id]
    ),
    query(
      'SELECT category, endpoint, status_code, created_at FROM api_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    ),
  ]);
  res.json({ stats: statsRes.rows[0], logs: logsRes.rows });
});

// ── GET /api/user/billing ─────────────────────────────────────────────────────
router.get('/billing', async (req, res) => {
  const [subs, credits] = await Promise.all([
    query('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [req.user.id]),
    query('SELECT * FROM credit_purchases WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [req.user.id]),
  ]);
  res.json({ subscriptions: subs.rows, credit_purchases: credits.rows });
});

module.exports = router;
