const { query } = require('../config/db');

const Payment = {
  // Create a pending payment — type is 'plan' (default) or 'credits'
  create: async ({ userId, planId = null, reference, amountNgn, type = 'plan' }) => {
    const r = await query(
      `INSERT INTO payments (user_id, plan_id, paystack_ref, amount_ngn, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, planId, reference, amountNgn, type]
    );
    return r.rows[0];
  },

  verify: async (reference) => {
    const r = await query(`SELECT * FROM payments WHERE paystack_ref = $1`, [reference]);
    return r.rows[0] || null;
  },

  // Mark a plan subscription payment as successful
  markSuccess: async (reference, planId, userId) => {
    await query(
      `UPDATE payments SET status = 'success', verified_at = NOW(), type = 'plan'
       WHERE paystack_ref = $1`,
      [reference]
    );
    // Upgrade plan, reset quota, and record the subscription day for monthly resets
    await query(
      `UPDATE users
       SET plan_id          = $1,
           api_calls_used   = 0,
           subscription_day = EXTRACT(DAY FROM NOW())::SMALLINT
       WHERE id = $2`,
      [planId, userId]
    );
  },

  // Mark a credit top-up payment as successful (no plan change)
  markCreditSuccess: async (reference) => {
    await query(
      `UPDATE payments SET status = 'success', verified_at = NOW()
       WHERE paystack_ref = $1`,
      [reference]
    );
  },

  listByUser: async (userId) => {
    const r = await query(
      `SELECT p.*, pl.name as plan_name
       FROM payments p
       LEFT JOIN plans pl ON pl.id = p.plan_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC LIMIT 20`,
      [userId]
    );
    return r.rows;
  },
};

module.exports = Payment;
