const axios          = require('axios');
const Plan           = require('../models/Plan');
const Payment        = require('../models/Payment');
const Credit         = require('../models/Credit');
const { query }      = require('../config/db');
const { getSetting } = require('../config/settings');

// GET /dashboard/billing
exports.getBilling = async (req, res, next) => {
  try {
    const plans    = await Plan.all();
    const payments = await Payment.listByUser(req.user.id);
    const planResult = await query('SELECT * FROM plans WHERE id = $1', [req.user.plan_id]);
    const currentPlan = planResult.rows[0] || null;

    const creditBalance = await Credit.getBalance(req.user.id);
    const creditTxns    = await Credit.listTransactions(req.user.id, 10);
    const isSubscriber  = currentPlan && currentPlan.price_ngn > 0;
    const publicKey     = await getSetting('PAYSTACK_PUBLIC_KEY', process.env.PAYSTACK_PUBLIC_KEY || '');

    res.render('dashboard/billing', {
      title:             'Credits & Billing — Viper-Team API',
      plans,
      payments,
      currentPlan,
      user:              req.user,
      PAYSTACK_PUBLIC_KEY: publicKey,
      creditBalance,
      creditTxns,
      creditPacks:       Credit.PACKS,
      isSubscriber,
      subscriberBonus:   Credit.SUBSCRIBER_BONUS,
    });
  } catch (err) {
    next(err);
  }
};

// POST /dashboard/billing/verify  (plan subscription payment)
exports.verifyPayment = async (req, res, next) => {
  const { reference, plan_id } = req.body;
  if (!reference || !plan_id) {
    return res.json({ success: false, error: 'Missing reference or plan.' });
  }

  let existing;
  try {
    existing = await Payment.verify(reference);
  } catch (err) {
    return next(err);
  }

  if (existing && existing.status === 'success') {
    return res.json({ success: true, message: 'Already applied.' });
  }

  try {
    const secretKey = await getSetting('PAYSTACK_SECRET_KEY', process.env.PAYSTACK_SECRET_KEY || '');
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secretKey}` }, timeout: 10000 }
    );

    if (!data.status || data.data.status !== 'success') {
      return res.json({ success: false, error: 'Payment not confirmed by Paystack.' });
    }

    const plan = await Plan.findById(plan_id);
    if (!plan) return res.json({ success: false, error: 'Plan not found.' });

    const paidNaira = Math.floor(data.data.amount / 100);
    if (paidNaira < plan.price_ngn) {
      return res.json({ success: false, error: 'Payment amount does not match plan price.' });
    }

    if (!existing) {
      await Payment.create({ userId: req.user.id, planId: plan.id, reference, amountNgn: paidNaira });
    }
    await Payment.markSuccess(reference, plan.id, req.user.id);

    res.json({ success: true, plan: plan.name });
  } catch (err) {
    console.error('Paystack verify error:', err.message);
    res.status(500).json({ success: false, error: 'Verification failed. Please contact support.' });
  }
};

// POST /dashboard/billing/credits/verify  (credit topup payment)
exports.verifyCredit = async (req, res, next) => {
  const { reference, pack_id } = req.body;
  if (!reference || !pack_id) {
    return res.json({ success: false, error: 'Missing reference or pack.' });
  }

  try {
    const alreadyUsed = await Credit.refAlreadyUsed(reference);
    if (alreadyUsed) {
      return res.json({ success: true, message: 'Already applied.' });
    }

    const pack = Credit.findPack(pack_id);
    if (!pack) return res.json({ success: false, error: 'Credit pack not found.' });

    const secretKey = await getSetting('PAYSTACK_SECRET_KEY', process.env.PAYSTACK_SECRET_KEY || '');
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secretKey}` }, timeout: 10000 }
    );

    if (!data.status || data.data.status !== 'success') {
      return res.json({ success: false, error: 'Payment not confirmed by Paystack.' });
    }

    const paidNaira = Math.floor(data.data.amount / 100);
    if (paidNaira < pack.price) {
      return res.json({ success: false, error: 'Payment amount does not match pack price.' });
    }

    const planResult  = await query('SELECT * FROM plans WHERE id = $1', [req.user.plan_id]);
    const currentPlan = planResult.rows[0];
    const isSubscriber = currentPlan && currentPlan.price_ngn > 0;
    const { grand, subscriberBonus } = Credit.calcCredits(pack, isSubscriber);

    // Record in payments table first (so admin sees it), then credit the balance
    const existingPayment = await Payment.verify(reference);
    if (!existingPayment) {
      await Payment.create({
        userId:    req.user.id,
        planId:    null,
        reference,
        amountNgn: paidNaira,
        type:      'credits',
      });
    }
    await Payment.markCreditSuccess(reference);

    await Credit.adjustBalance(
      req.user.id,
      grand,
      'topup',
      `${pack.label} pack (${pack.total} credits${subscriberBonus > 0 ? ` + ${subscriberBonus} subscriber bonus` : ''})`,
      reference
    );

    res.json({ success: true, credits: grand, bonus: subscriberBonus, packName: pack.label });
  } catch (err) {
    console.error('Credit verify error:', err.message);
    res.status(500).json({ success: false, error: 'Verification failed. Please contact support.' });
  }
};
