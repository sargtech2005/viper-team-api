const axios   = require('axios');
const Plan    = require('../models/Plan');
const Payment = require('../models/Payment');
const { query } = require('../config/db');

// GET /dashboard/billing
exports.getBilling = async (req, res, next) => {
  try {
    const plans    = await Plan.all();
    const payments = await Payment.listByUser(req.user.id);
    const planResult = await query('SELECT * FROM plans WHERE id = $1', [req.user.plan_id]);
    const currentPlan = planResult.rows[0] || null;

    res.render('dashboard/billing', {
      title: 'Billing — Viper-Team API',
      plans,
      payments,
      currentPlan,
      user: req.user,
      PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
    });
  } catch (err) {
    next(err);
  }
};

// POST /dashboard/billing/verify  (called after Paystack popup closes)
exports.verifyPayment = async (req, res, next) => {
  const { reference, plan_id } = req.body;
  if (!reference || !plan_id) {
    return res.json({ success: false, error: 'Missing reference or plan.' });
  }

  // Check not already processed
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
    // Verify with Paystack API
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, timeout: 10000 }
    );

    if (!data.status || data.data.status !== 'success') {
      return res.json({ success: false, error: 'Payment not confirmed by Paystack.' });
    }

    const plan = await Plan.findById(plan_id);
    if (!plan) return res.json({ success: false, error: 'Plan not found.' });

    // Verify amount matches plan price (convert kobo → naira)
    const paidNaira = Math.floor(data.data.amount / 100);
    if (paidNaira < plan.price_ngn) {
      return res.json({ success: false, error: 'Payment amount does not match plan price.' });
    }

    // Save and upgrade
    if (!existing) {
      await Payment.create({
        userId: req.user.id,
        planId: plan.id,
        reference,
        amountNgn: paidNaira,
      });
    }
    await Payment.markSuccess(reference, plan.id, req.user.id);

    res.json({ success: true, plan: plan.name });
  } catch (err) {
    console.error('Paystack verify error:', err.message);
    res.status(500).json({ success: false, error: 'Verification failed. Please contact support.' });
  }
};
