const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { adminOnly }   = require('../../middleware/adminOnly');
const { query }       = require('../../config/db');
const Plan            = require('../../models/Plan');
const Credit          = require('../../models/Credit');
const { getSetting, setSetting } = require('../../config/settings');

router.use(requireAuth, adminOnly);

// ── Admin Overview ────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [usersR, plansR, paymentsR, logsR] = await Promise.all([
      query(`SELECT COUNT(*) FROM users`),
      query(`SELECT COUNT(*) FROM api_keys WHERE is_active=true`),
      query(`SELECT COALESCE(SUM(amount_ngn),0) as total FROM payments WHERE status='success'`),
      query(`SELECT COUNT(*) FROM api_logs`),
    ]);
    const recentUsers = await query(`SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5`);
    res.render('admin/index', {
      title: 'Admin Panel — Viper-Team API',
      stats: {
        users:    usersR.rows[0].count,
        apiKeys:  plansR.rows[0].count,
        revenue:  paymentsR.rows[0].total,
        apiCalls: logsR.rows[0].count,
      },
      recentUsers: recentUsers.rows,
      totalUsersCount: parseInt(usersR.rows[0].count),
    });
  } catch (err) { next(err); }
});

// ── Users List ────────────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const search = (req.query.q || '').trim();
    const limit  = 25, offset = (page - 1) * limit;

    let usersQuery, countQuery, params;
    if (search) {
      usersQuery = `SELECT u.*, p.name as plan_name FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.username ILIKE $1 OR u.email ILIKE $1 ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`;
      countQuery = `SELECT COUNT(*) FROM users WHERE username ILIKE $1 OR email ILIKE $1`;
      params     = [`%${search}%`, limit, offset];
    } else {
      usersQuery = `SELECT u.*, p.name as plan_name FROM users u LEFT JOIN plans p ON p.id = u.plan_id ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`;
      countQuery = `SELECT COUNT(*) FROM users`;
      params     = [limit, offset];
    }

    const [users, countR, plans] = await Promise.all([
      query(usersQuery, params),
      query(countQuery, search ? [`%${search}%`] : []),
      Plan.all(),
    ]);
    const total = parseInt(countR.rows[0].count);
    res.render('admin/users', {
      title: 'Users — Admin',
      users: users.rows, plans,
      page, total, limit, totalPages: Math.ceil(total / limit), search,
    });
  } catch (err) { next(err); }
});

// GET /admin/users/:id — JSON for modal
router.get('/users/:id', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.*, p.name as plan_name FROM users u LEFT JOIN plans p ON p.id = u.plan_id WHERE u.id = $1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const u = r.rows[0];
    delete u.password_hash; delete u.reset_token; delete u.reset_expires;
    res.json({ success: true, user: u });
  } catch (err) { next(err); }
});

// POST /admin/users/:id/toggle — ban/unban
router.post('/users/:id/toggle', async (req, res, next) => {
  try {
    const u = await query(`SELECT is_active FROM users WHERE id = $1`, [req.params.id]);
    if (!u.rows.length) return res.json({ success: false, error: 'User not found' });
    const newStatus = !u.rows[0].is_active;
    await query(`UPDATE users SET is_active = $1 WHERE id = $2`, [newStatus, req.params.id]);
    res.json({ success: true, is_active: newStatus });
  } catch (err) { next(err); }
});

// POST /admin/users/:id/plan — change plan
router.post('/users/:id/plan', async (req, res, next) => {
  try {
    const { plan_id } = req.body;
    if (!plan_id) return res.json({ success: false, error: 'plan_id required' });
    const plan = await Plan.findById(plan_id);
    if (!plan) return res.json({ success: false, error: 'Plan not found' });
    await query(`UPDATE users SET plan_id = $1 WHERE id = $2`, [plan_id, req.params.id]);
    res.json({ success: true, plan_name: plan.name });
  } catch (err) { next(err); }
});

// POST /admin/users/:id/credits — adjust credits
router.post('/users/:id/credits', async (req, res, next) => {
  try {
    let { amount, reason } = req.body;
    amount = parseInt(amount);
    if (isNaN(amount) || amount === 0) return res.json({ success: false, error: 'Invalid amount' });
    const userR = await query(`SELECT id, credit_balance FROM users WHERE id = $1`, [req.params.id]);
    if (!userR.rows.length) return res.json({ success: false, error: 'User not found' });
    const current = userR.rows[0].credit_balance || 0;
    const newBalance = current + amount;
    if (newBalance < 0) return res.json({ success: false, error: `Cannot deduct more than current balance (${current})` });
    await query(`UPDATE users SET credit_balance = $1 WHERE id = $2`, [newBalance, req.params.id]);
    const txType = amount > 0 ? 'bonus' : 'usage';
    const desc   = reason?.trim() || (amount > 0 ? 'Admin credit grant' : 'Admin credit deduction');
    await query(`INSERT INTO credit_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)`,
      [req.params.id, txType, amount, desc]);
    res.json({ success: true, new_balance: newBalance });
  } catch (err) { next(err); }
});

// POST /admin/users/:id/reset-limit — reset API call counter
router.post('/users/:id/reset-limit', async (req, res, next) => {
  try {
    const r = await query(`UPDATE users SET api_calls_used = 0 WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!r.rows.length) return res.json({ success: false, error: 'User not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /admin/users/:id/role — toggle role
router.post('/users/:id/role', async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.json({ success: false, error: 'You cannot change your own role.' });
    const userR = await query(`SELECT role FROM users WHERE id = $1`, [req.params.id]);
    if (!userR.rows.length) return res.json({ success: false, error: 'User not found' });
    const newRole = userR.rows[0].role === 'admin' ? 'user' : 'admin';
    await query(`UPDATE users SET role = $1 WHERE id = $2`, [newRole, req.params.id]);
    res.json({ success: true, role: newRole });
  } catch (err) { next(err); }
});

// POST /admin/users/:id/delete — delete user
router.post('/users/:id/delete', async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.json({ success: false, error: 'You cannot delete your own account.' });
    const r = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!r.rows.length) return res.json({ success: false, error: 'User not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Plans ─────────────────────────────────────────────────────────────────────
router.get('/plans', async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM plans ORDER BY price_ngn ASC`);
    res.render('admin/plans', { title: 'Plans — Admin', plans: r.rows });
  } catch (err) { next(err); }
});

// POST /admin/plans/create
router.post('/plans/create', async (req, res, next) => {
  try {
    let { name, price_ngn, api_limit, rate_per_min, features, is_active } = req.body;
    if (!name?.trim()) return res.json({ success: false, error: 'Plan name is required.' });
    price_ngn    = parseInt(price_ngn)    || 0;
    api_limit    = parseInt(api_limit)    || 100;
    rate_per_min = parseInt(rate_per_min) || 10;
    is_active    = is_active === 'true' || is_active === true || is_active === '1';
    // Parse features — accept newline-separated or JSON
    let featsArr = [];
    if (features && features.trim()) {
      try { featsArr = JSON.parse(features); }
      catch { featsArr = features.split('\n').map(f => f.trim()).filter(Boolean); }
    }
    const r = await query(
      `INSERT INTO plans (name, price_ngn, api_limit, rate_per_min, features, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name.trim(), price_ngn, api_limit, rate_per_min, JSON.stringify(featsArr), is_active]
    );
    res.json({ success: true, plan: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.json({ success: false, error: 'A plan with that name already exists.' });
    next(err);
  }
});

// POST /admin/plans/:id/edit
router.post('/plans/:id/edit', async (req, res, next) => {
  try {
    let { name, price_ngn, api_limit, rate_per_min, features, is_active } = req.body;
    if (!name?.trim()) return res.json({ success: false, error: 'Plan name is required.' });
    price_ngn    = parseInt(price_ngn)    || 0;
    api_limit    = parseInt(api_limit)    || 100;
    rate_per_min = parseInt(rate_per_min) || 10;
    is_active    = is_active === 'true' || is_active === true || is_active === '1';
    let featsArr = [];
    if (features && features.trim()) {
      try { featsArr = JSON.parse(features); }
      catch { featsArr = features.split('\n').map(f => f.trim()).filter(Boolean); }
    }
    const r = await query(
      `UPDATE plans SET name=$1, price_ngn=$2, api_limit=$3, rate_per_min=$4, features=$5, is_active=$6
       WHERE id=$7 RETURNING *`,
      [name.trim(), price_ngn, api_limit, rate_per_min, JSON.stringify(featsArr), is_active, req.params.id]
    );
    if (!r.rows.length) return res.json({ success: false, error: 'Plan not found.' });
    res.json({ success: true, plan: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.json({ success: false, error: 'A plan with that name already exists.' });
    next(err);
  }
});

// POST /admin/plans/:id/delete
router.post('/plans/:id/delete', async (req, res, next) => {
  try {
    const r = await query(`DELETE FROM plans WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!r.rows.length) return res.json({ success: false, error: 'Plan not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /admin/plans/:id/toggle
router.post('/plans/:id/toggle', async (req, res, next) => {
  try {
    const cur = await query(`SELECT is_active FROM plans WHERE id = $1`, [req.params.id]);
    if (!cur.rows.length) return res.json({ success: false, error: 'Plan not found.' });
    const next_status = !cur.rows[0].is_active;
    await query(`UPDATE plans SET is_active = $1 WHERE id = $2`, [next_status, req.params.id]);
    res.json({ success: true, is_active: next_status });
  } catch (err) { next(err); }
});

// ── Credit Packs ──────────────────────────────────────────────────────────────
router.get('/credits', async (req, res, next) => {
  try {
    const packs = await Credit.allPacks();
    const subscriberBonus = await Credit.getSubscriberBonus();
    res.render('admin/credits', { title: 'Credit Packs — Admin', packs, subscriberBonus });
  } catch (err) { next(err); }
});

// POST /admin/credits/create
router.post('/credits/create', async (req, res, next) => {
  try {
    let { pack_id, label, price_ngn, base, bonus, bonus_pct, sort_order } = req.body;
    if (!pack_id?.trim() || !label?.trim()) return res.json({ success: false, error: 'Pack ID and label are required.' });
    const slug = pack_id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const pack = await Credit.createPack({
      packId: slug, label: label.trim(),
      priceNgn:   parseInt(price_ngn)   || 500,
      base:       parseInt(base)        || 600,
      bonus:      parseInt(bonus)       || 0,
      bonusPct:   parseInt(bonus_pct)   || 0,
      sortOrder:  parseInt(sort_order)  || 0,
    });
    res.json({ success: true, pack: { ...pack, total: pack.base + pack.bonus } });
  } catch (err) {
    if (err.code === '23505') return res.json({ success: false, error: 'A pack with that ID already exists.' });
    next(err);
  }
});

// POST /admin/credits/:id/edit
router.post('/credits/:id/edit', async (req, res, next) => {
  try {
    let { label, price_ngn, base, bonus, bonus_pct, is_active, sort_order } = req.body;
    if (!label?.trim()) return res.json({ success: false, error: 'Label is required.' });
    is_active = is_active === 'true' || is_active === true || is_active === '1';
    const pack = await Credit.updatePack(req.params.id, {
      label:      label.trim(),
      priceNgn:   parseInt(price_ngn)  || 500,
      base:       parseInt(base)       || 600,
      bonus:      parseInt(bonus)      || 0,
      bonusPct:   parseInt(bonus_pct)  || 0,
      isActive:   is_active,
      sortOrder:  parseInt(sort_order) || 0,
    });
    if (!pack) return res.json({ success: false, error: 'Pack not found.' });
    res.json({ success: true, pack: { ...pack, total: pack.base + pack.bonus } });
  } catch (err) { next(err); }
});

// POST /admin/credits/:id/delete
router.post('/credits/:id/delete', async (req, res, next) => {
  try {
    const r = await Credit.deletePack(req.params.id);
    if (!r) return res.json({ success: false, error: 'Pack not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /admin/credits/subscriber-bonus — update subscriber bonus %
router.post('/credits/subscriber-bonus', async (req, res, next) => {
  try {
    const pct = parseInt(req.body.bonus_pct);
    if (isNaN(pct) || pct < 0 || pct > 100) return res.json({ success: false, error: 'Enter a value between 0 and 100.' });
    await setSetting('SUBSCRIBER_BONUS_PCT', String(pct));
    res.json({ success: true, pct });
  } catch (err) { next(err); }
});

// ── Payments ──────────────────────────────────────────────────────────────────
router.get('/payments', async (req, res, next) => {
  try {
    const payments = await query(
      `SELECT p.*, u.username, u.email, pl.name as plan_name
       FROM payments p JOIN users u ON u.id = p.user_id LEFT JOIN plans pl ON pl.id = p.plan_id
       ORDER BY p.created_at DESC LIMIT 50`
    );
    const secretKey = await getSetting('PAYSTACK_SECRET_KEY', process.env.PAYSTACK_SECRET_KEY || '');
    const publicKey = await getSetting('PAYSTACK_PUBLIC_KEY', process.env.PAYSTACK_PUBLIC_KEY || '');
    const mask = v => v ? v.slice(0, 8) + '••••••••••••••••' + v.slice(-6) : '';
    res.render('admin/payments', {
      title: 'Payments — Admin',
      payments: payments.rows,
      secretKeyMasked: mask(secretKey),
      publicKeyMasked: mask(publicKey),
      secretKeySet: !!secretKey,
      publicKeySet: !!publicKey,
    });
  } catch (err) { next(err); }
});

router.post('/payments/keys', async (req, res, next) => {
  try {
    const { secret_key, public_key } = req.body;
    if (secret_key && secret_key.trim()) await setSetting('PAYSTACK_SECRET_KEY', secret_key.trim());
    if (public_key && public_key.trim()) await setSetting('PAYSTACK_PUBLIC_KEY', public_key.trim());
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', async (req, res, next) => {
  try {
    const keys = ['APP_NAME','MAINTENANCE_MODE','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM','RECAPTCHA_SITE_KEY','RECAPTCHA_SECRET_KEY'];
    const settings = {};
    for (const k of keys) settings[k] = await getSetting(k, process.env[k] || '');
    const maskSecret = v => v && v.length > 8 ? v.slice(0, 4) + '••••••••••••' + v.slice(-4) : v ? '••••••••••••••••' : '';
    res.render('admin/settings', {
      title: 'Site Settings — Admin',
      s: settings,
      smtpPassMasked:        maskSecret(settings.SMTP_PASS),
      recaptchaSecretMasked: maskSecret(settings.RECAPTCHA_SECRET_KEY),
      smtpPassSet:           !!settings.SMTP_PASS,
      recaptchaSecretSet:    !!settings.RECAPTCHA_SECRET_KEY,
    });
  } catch (err) { next(err); }
});

router.post('/settings', async (req, res, next) => {
  try {
    const { app_name, maintenance_mode, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, recaptcha_site_key, recaptcha_secret_key } = req.body;
    if (app_name !== undefined) await setSetting('APP_NAME', app_name.trim() || 'Viper-Team API');
    await setSetting('MAINTENANCE_MODE', maintenance_mode === '1' ? 'on' : 'off');
    if (smtp_host?.trim())            await setSetting('SMTP_HOST', smtp_host.trim());
    if (smtp_port?.trim())            await setSetting('SMTP_PORT', smtp_port.trim());
    if (smtp_user?.trim())            await setSetting('SMTP_USER', smtp_user.trim());
    if (smtp_pass?.trim())            await setSetting('SMTP_PASS', smtp_pass.trim());
    if (smtp_from?.trim())            await setSetting('SMTP_FROM', smtp_from.trim());
    if (recaptcha_site_key?.trim())   await setSetting('RECAPTCHA_SITE_KEY',   recaptcha_site_key.trim());
    if (recaptcha_secret_key?.trim()) await setSetting('RECAPTCHA_SECRET_KEY', recaptcha_secret_key.trim());
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
