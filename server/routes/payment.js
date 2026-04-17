const router  = require('express').Router();
const crypto  = require('crypto');
const { query } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { paystackInitialize } = require('../services/paystack');

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = {
  starter:  { price: 5000,  credits: 150,  label: 'Starter' },
  basic:    { price: 9000,  credits: 300,  label: 'Basic'   },
  pro:      { price: 15000, credits: 500,  label: 'Pro'     },
  business: { price: 25000, credits: 800,  label: 'Business'},
};

// Credit packs (top-up, not subscription)
const CREDIT_PACKS = {
  pack_100: { credits: 100, price: 2000 },
  pack_300: { credits: 300, price: 5500 },
  pack_500: { credits: 500, price: 8500 },
};

// ── POST /api/payment/subscribe ───────────────────────────────────────────────
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;
    const planDef  = PLANS[plan];
    if (!planDef) return res.status(400).json({ error: 'Invalid plan' });

    const ref = `sub_${req.user.id}_${plan}_${Date.now()}`;
    const callbackUrl = `${process.env.APP_URL}/dashboard/billing?ref=${ref}`;

    const paystackUrl = await paystackInitialize({
      email:    req.user.email,
      amount:   planDef.price * 100, // kobo
      reference: ref,
      metadata: { user_id: req.user.id, type: 'subscription', plan },
      callback_url: callbackUrl,
    });

    // Create pending subscription record
    await query(
      `INSERT INTO subscriptions (user_id, plan_name, price_ngn, credits_limit, paystack_ref, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [req.user.id, plan, planDef.price, planDef.credits, ref]
    );

    res.json({ payment_url: paystackUrl, reference: ref });
  } catch (err) {
    console.error('Subscribe error:', err.message);
    res.status(500).json({ error: 'Could not initiate payment. Try again.' });
  }
});

// ── POST /api/payment/buy-credits ─────────────────────────────────────────────
router.post('/buy-credits', authMiddleware, async (req, res) => {
  try {
    const { pack } = req.body;
    const packDef  = CREDIT_PACKS[pack];
    if (!packDef) return res.status(400).json({ error: 'Invalid credit pack' });

    const ref = `crd_${req.user.id}_${pack}_${Date.now()}`;
    const callbackUrl = `${process.env.APP_URL}/dashboard/billing?ref=${ref}`;

    const paystackUrl = await paystackInitialize({
      email:    req.user.email,
      amount:   packDef.price * 100,
      reference: ref,
      metadata: { user_id: req.user.id, type: 'credits', pack },
      callback_url: callbackUrl,
    });

    await query(
      `INSERT INTO credit_purchases (user_id, credits, price_ngn, paystack_ref, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [req.user.id, packDef.credits, packDef.price, ref]
    );

    res.json({ payment_url: paystackUrl, reference: ref });
  } catch (err) {
    console.error('Buy credits error:', err.message);
    res.status(500).json({ error: 'Could not initiate payment. Try again.' });
  }
});

// ── POST /api/payment/webhook (Paystack) ──────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    // Verify Paystack signature
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) return res.status(401).send('Invalid signature');

    const event = req.body;
    if (event.event !== 'charge.success') return res.sendStatus(200);

    const { reference, metadata } = event.data;

    if (metadata?.type === 'subscription') {
      const plan = metadata.plan;
      const planDef = PLANS[plan];
      if (!planDef) return res.sendStatus(200);

      const now      = new Date();
      const expires  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Update subscription status
      await query(
        `UPDATE subscriptions SET status = 'active', starts_at = $1, expires_at = $2
         WHERE paystack_ref = $3`,
        [now, expires, reference]
      );

      // Update user plan & reset credits
      await query(
        `UPDATE users SET
           plan = $1,
           credits_remaining = $2,
           credits_used = 0,
           credits_reset_at = $3
         WHERE id = $4`,
        [plan, planDef.credits, expires, metadata.user_id]
      );
    }

    if (metadata?.type === 'credits') {
      const { rows } = await query(
        'SELECT * FROM credit_purchases WHERE paystack_ref = $1',
        [reference]
      );
      const purchase = rows[0];
      if (!purchase) return res.sendStatus(200);

      await query('UPDATE credit_purchases SET status = $1 WHERE paystack_ref = $2', ['success', reference]);
      await query(
        'UPDATE users SET credits_remaining = credits_remaining + $1 WHERE id = $2',
        [purchase.credits, purchase.user_id]
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ── GET /api/payment/verify/:ref ─────────────────────────────────────────────
router.get('/verify/:ref', authMiddleware, async (req, res) => {
  const { ref } = req.params;
  const [sub, cred] = await Promise.all([
    query('SELECT * FROM subscriptions WHERE paystack_ref = $1 AND user_id = $2', [ref, req.user.id]),
    query('SELECT * FROM credit_purchases WHERE paystack_ref = $1 AND user_id = $2', [ref, req.user.id]),
  ]);
  const record = sub.rows[0] || cred.rows[0];
  if (!record) return res.status(404).json({ error: 'Reference not found' });
  res.json(record);
});

module.exports = router;
