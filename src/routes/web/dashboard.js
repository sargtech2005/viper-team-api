const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/db');
const apiKeyCtrl      = require('../../controllers/apiKeyController');
const paymentCtrl     = require('../../controllers/paymentController');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const planResult   = await query('SELECT * FROM plans WHERE id = $1', [req.user.plan_id]);
    const plan         = planResult.rows[0] || { name: 'Free', api_limit: 500, rate_per_min: 10 };
    const keysResult   = await query('SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC LIMIT 2', [req.user.id]);
    const keysCountR   = await query('SELECT COUNT(*) FROM api_keys WHERE user_id = $1', [req.user.id]);
    const logsResult   = await query(`SELECT endpoint, status_code, duration_ms, created_at FROM api_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 2`, [req.user.id]);
    const logsCountR   = await query('SELECT COUNT(*) FROM api_logs WHERE user_id = $1', [req.user.id]);
    const creditResult = await query('SELECT credit_balance FROM users WHERE id = $1', [req.user.id]);
    const creditBalance = creditResult.rows[0]?.credit_balance ?? 0;
    const totalKeys = parseInt(keysCountR.rows[0].count);
    const totalLogs = parseInt(logsCountR.rows[0].count);
    res.render('dashboard/index', { title: 'Dashboard — Viper-Team API', plan, apiKeys: keysResult.rows, totalKeys, recentLogs: logsResult.rows, totalLogs, showWelcome: req.query.welcome === '1', creditBalance });
  } catch (err) {
    console.error(err);
    res.render('dashboard/index', { title: 'Dashboard — Viper-Team API', plan: { name: 'Free', api_limit: 500, rate_per_min: 10 }, apiKeys: [], totalKeys: 0, recentLogs: [], totalLogs: 0, showWelcome: false, creditBalance: 0 });
  }
});

router.get('/api-keys',           apiKeyCtrl.list);
router.post('/api-keys/generate', apiKeyCtrl.generate);
router.delete('/api-keys/:id',    apiKeyCtrl.deleteKey);

router.get('/billing',                      paymentCtrl.getBilling);
router.post('/billing/verify',             paymentCtrl.verifyPayment);
router.post('/billing/credits/verify',     paymentCtrl.verifyCredit);

router.get('/logs', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 30, offset = (page - 1) * limit;
    const logs = await query(`SELECT l.*, k.label as key_label FROM api_logs l LEFT JOIN api_keys k ON k.id = l.api_key_id WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT $2 OFFSET $3`, [req.user.id, limit, offset]);
    const countResult = await query(`SELECT COUNT(*) FROM api_logs WHERE user_id = $1`, [req.user.id]);
    const total = parseInt(countResult.rows[0].count);
    res.render('dashboard/logs', { title: 'Logs — Viper-Team API', logs: logs.rows, page, total, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
