const express = require('express');
const router  = express.Router();
const Plan    = require('../../models/Plan');
const { optionalAuth } = require('../../middleware/auth');

router.get('/', optionalAuth, async (req, res) => {
  try {
    const plans = await Plan.all();
    res.render('pricing', {
      title: 'Pricing — Viper-Team API',
      plans,
      PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
    });
  } catch (err) {
    console.error('Pricing route error:', err);
    res.render('pricing', {
      title: 'Pricing — Viper-Team API',
      plans: [],
      PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
    });
  }
});

module.exports = router;
