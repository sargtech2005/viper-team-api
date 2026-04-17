const router = require('express').Router();
const { query } = require('../db');
const { adminMiddleware } = require('../middleware/auth');

router.use(adminMiddleware);

// ── Overview stats ────────────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  const [users, subs, calls, revenue] = await Promise.all([
    query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL \'7 days\') AS this_week FROM users'),
    query('SELECT COUNT(*) FILTER (WHERE status=\'active\') AS active, COUNT(*) AS total FROM subscriptions'),
    query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL \'24 hours\') AS today FROM api_logs'),
    query('SELECT COALESCE(SUM(price_ngn),0) AS total FROM subscriptions WHERE status=\'active\''),
  ]);
  res.json({
    users:   users.rows[0],
    subs:    subs.rows[0],
    calls:   calls.rows[0],
    revenue: revenue.rows[0],
  });
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const { search, plan, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let conds = [], vals = [];
  if (search) { vals.push(`%${search}%`); conds.push(`(name ILIKE $${vals.length} OR email ILIKE $${vals.length})`); }
  if (plan)   { vals.push(plan);           conds.push(`plan = $${vals.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

  const [rows, count] = await Promise.all([
    query(`SELECT id, name, email, plan, api_key, credits_remaining, credits_used, is_admin, is_active, created_at FROM users ${where} ORDER BY created_at DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`, [...vals, limit, offset]),
    query(`SELECT COUNT(*) FROM users ${where}`, vals),
  ]);
  res.json({ users: rows.rows, total: parseInt(count.rows[0].count) });
});

router.get('/users/:id', async (req, res) => {
  const { rows } = await query('SELECT id,name,email,plan,api_key,credits_remaining,credits_used,is_admin,is_active,email_verified,created_at FROM users WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.patch('/users/:id', async (req, res) => {
  const { plan, credits_remaining, is_active, is_admin } = req.body;
  const sets = []; const vals = [];
  if (plan               !== undefined) { vals.push(plan);               sets.push(`plan=$${vals.length}`); }
  if (credits_remaining  !== undefined) { vals.push(credits_remaining);  sets.push(`credits_remaining=$${vals.length}`); }
  if (is_active          !== undefined) { vals.push(is_active);          sets.push(`is_active=$${vals.length}`); }
  if (is_admin           !== undefined) { vals.push(is_admin);           sets.push(`is_admin=$${vals.length}`); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  const { rows } = await query(`UPDATE users SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING id,name,email,plan,is_active,is_admin`, vals);
  res.json(rows[0]);
});

// ── Payments ──────────────────────────────────────────────────────────────────
router.get('/payments', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { rows } = await query(
    `SELECT s.*, u.name, u.email FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json(rows);
});

router.get('/credit-purchases', async (req, res) => {
  const { rows } = await query(
    `SELECT cp.*, u.name, u.email FROM credit_purchases cp
     JOIN users u ON u.id = cp.user_id ORDER BY cp.created_at DESC LIMIT 50`
  );
  res.json(rows);
});

// ── API Categories ────────────────────────────────────────────────────────────
router.get('/categories', async (_req, res) => {
  const { rows } = await query('SELECT * FROM api_categories ORDER BY sort_order');
  res.json(rows);
});

router.post('/categories', async (req, res) => {
  const { name, slug, description, icon, sort_order = 0 } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  const { rows } = await query(
    'INSERT INTO api_categories (name,slug,description,icon,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [name, slug, description, icon || '⚡', sort_order]
  );
  res.status(201).json(rows[0]);
});

router.patch('/categories/:id', async (req, res) => {
  const { name, description, icon, is_active, sort_order } = req.body;
  const { rows } = await query(
    'UPDATE api_categories SET name=COALESCE($1,name),description=COALESCE($2,description),icon=COALESCE($3,icon),is_active=COALESCE($4,is_active),sort_order=COALESCE($5,sort_order) WHERE id=$6 RETURNING *',
    [name, description, icon, is_active, sort_order, req.params.id]
  );
  res.json(rows[0]);
});

// ── API Endpoints ─────────────────────────────────────────────────────────────
router.get('/endpoints', async (req, res) => {
  const { category_id } = req.query;
  const cond = category_id ? 'WHERE e.category_id=$1' : '';
  const { rows } = await query(
    `SELECT e.*, c.name AS category_name FROM api_endpoints e JOIN api_categories c ON c.id=e.category_id ${cond} ORDER BY e.id`,
    category_id ? [category_id] : []
  );
  res.json(rows);
});

router.post('/endpoints', async (req, res) => {
  const { category_id, name, slug, description, method, proxy_url, is_free } = req.body;
  if (!category_id || !name || !slug) return res.status(400).json({ error: 'category_id, name, slug required' });
  const { rows } = await query(
    'INSERT INTO api_endpoints (category_id,name,slug,description,method,proxy_url,is_free) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [category_id, name, slug, description, method || 'GET', proxy_url, is_free || false]
  );
  res.status(201).json(rows[0]);
});

router.patch('/endpoints/:id', async (req, res) => {
  const { name, description, proxy_url, is_active, is_free } = req.body;
  const { rows } = await query(
    'UPDATE api_endpoints SET name=COALESCE($1,name),description=COALESCE($2,description),proxy_url=COALESCE($3,proxy_url),is_active=COALESCE($4,is_active),is_free=COALESCE($5,is_free) WHERE id=$6 RETURNING *',
    [name, description, proxy_url, is_active, is_free, req.params.id]
  );
  res.json(rows[0]);
});

// ── Site Settings ─────────────────────────────────────────────────────────────
router.get('/settings', async (_req, res) => {
  const { rows } = await query('SELECT key, value FROM site_settings ORDER BY key');
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json(settings);
});

router.put('/settings', async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return res.status(400).json({ error: 'No settings provided' });
  for (const [key, value] of entries) {
    await query(
      'INSERT INTO site_settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=$2, updated_at=NOW()',
      [key, String(value)]
    );
  }
  res.json({ message: 'Settings saved' });
});

// ── API Logs ─────────────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  const { limit = 100 } = req.query;
  const { rows } = await query(
    `SELECT l.*, u.email FROM api_logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

module.exports = router;
