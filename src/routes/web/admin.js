const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { adminOnly }   = require('../../middleware/adminOnly');
const { query }       = require('../../config/db');
const Plan            = require('../../models/Plan');

router.use(requireAuth, adminOnly);

// Admin overview
router.get('/', async (req, res) => {
  const [usersR, plansR, paymentsR, logsR] = await Promise.all([
    query(`SELECT COUNT(*) FROM users`),
    query(`SELECT COUNT(*) FROM api_keys WHERE is_active=true`),
    query(`SELECT COALESCE(SUM(amount_ngn),0) as total FROM payments WHERE status='success'`),
    query(`SELECT COUNT(*) FROM api_logs`),
  ]);
  const recentUsers = await query(`SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10`);
  res.render('admin/index', {
    title: 'Admin Panel — Viper-Team API',
    stats: {
      users:    usersR.rows[0].count,
      apiKeys:  plansR.rows[0].count,
      revenue:  paymentsR.rows[0].total,
      apiCalls: logsR.rows[0].count,
    },
    recentUsers: recentUsers.rows,
  });
});

// Users list
router.get('/users', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 25, offset = (page - 1) * limit;
  const users = await query(
    `SELECT u.*, p.name as plan_name FROM users u LEFT JOIN plans p ON p.id = u.plan_id ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const total = parseInt((await query(`SELECT COUNT(*) FROM users`)).rows[0].count);
  res.render('admin/users', {
    title: 'Users — Admin',
    users: users.rows, page, total, limit,
    totalPages: Math.ceil(total / limit),
  });
});

// Toggle user active/ban
router.post('/users/:id/toggle', async (req, res) => {
  const u = await query(`SELECT is_active FROM users WHERE id = $1`, [req.params.id]);
  if (!u.rows.length) return res.json({ success: false, error: 'User not found' });
  const newStatus = !u.rows[0].is_active;
  await query(`UPDATE users SET is_active = $1 WHERE id = $2`, [newStatus, req.params.id]);
  res.json({ success: true, is_active: newStatus });
});

// Payments list
router.get('/payments', async (req, res) => {
  const payments = await query(
    `SELECT p.*, u.username, u.email, pl.name as plan_name
     FROM payments p JOIN users u ON u.id = p.user_id LEFT JOIN plans pl ON pl.id = p.plan_id
     ORDER BY p.created_at DESC LIMIT 50`
  );
  res.render('admin/payments', { title: 'Payments — Admin', payments: payments.rows });
});

// Plans management
router.get('/plans', async (req, res) => {
  const plans = await Plan.all();
  res.render('admin/plans', { title: 'Plans — Admin', plans });
});

module.exports = router;
