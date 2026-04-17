const { query } = require('../config/db');

const Payment = {
  create: async ({ userId, planId, reference, amountNgn }) => {
    const r = await query(
      `INSERT INTO payments (user_id, plan_id, paystack_ref, amount_ngn)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, planId, reference, amountNgn]
    );
    return r.rows[0];
  },

  verify: async (reference) => {
    const r = await query(`SELECT * FROM payments WHERE paystack_ref = $1`, [reference]);
    return r.rows[0] || null;
  },

  markSuccess: async (reference, planId, userId) => {
    await query(
      `UPDATE payments SET status = 'success', verified_at = NOW() WHERE paystack_ref = $1`,
      [reference]
    );
    // Upgrade user plan + reset call counter
    await query(
      `UPDATE users SET plan_id = $1, api_calls_used = 0 WHERE id = $2`,
      [planId, userId]
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
