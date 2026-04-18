const { query } = require('../config/db');

// Credit packs definition (source of truth)
const CREDIT_PACKS = [
  { id: 'topup',  label: 'Top-up',  price: 500,   base: 600,   bonus: 0,   bonusPct: 0,   total: 600,   perCall: 0.83, minTopup: true  },
  { id: 'bundle', label: 'Bundle',  price: 2000,  base: 3000,  bonus: 450, bonusPct: 15,  total: 3450,  perCall: 0.58, minTopup: false },
  { id: 'stack',  label: 'Stack',   price: 7500,  base: 15000, bonus: 3750, bonusPct: 25, total: 18750, perCall: 0.40, minTopup: false },
  { id: 'bulk',   label: 'Bulk',    price: 20000, base: 50000, bonus: 17500, bonusPct: 35, total: 67500, perCall: 0.30, minTopup: false },
];

const SUBSCRIBER_BONUS = 0.20; // 20% extra credits for active subscribers

const Credit = {
  PACKS: CREDIT_PACKS,
  SUBSCRIBER_BONUS,

  findPack: (packId) => CREDIT_PACKS.find(p => p.id === packId) || null,

  // Get user's current balance
  getBalance: async (userId) => {
    const r = await query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
    return r.rows[0]?.credit_balance ?? 0;
  },

  // Credit or debit user balance
  adjustBalance: async (userId, amount, type, description, paystackRef = null) => {
    // Update balance (prevent going below 0)
    if (amount < 0) {
      await query(
        'UPDATE users SET credit_balance = GREATEST(0, credit_balance + $1) WHERE id = $2',
        [amount, userId]
      );
    } else {
      await query(
        'UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2',
        [amount, userId]
      );
    }
    // Log transaction
    const r = await query(
      `INSERT INTO credit_transactions (user_id, type, amount, description, paystack_ref)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, amount, description, paystackRef]
    );
    return r.rows[0];
  },

  // Check if a paystack ref was already processed
  refAlreadyUsed: async (paystackRef) => {
    const r = await query(
      'SELECT id FROM credit_transactions WHERE paystack_ref = $1 AND type = $2',
      [paystackRef, 'topup']
    );
    return r.rows.length > 0;
  },

  // List recent transactions for a user
  listTransactions: async (userId, limit = 20) => {
    const r = await query(
      `SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return r.rows;
  },

  // Calculate total credits for a purchase (with optional subscriber bonus)
  calcCredits: (pack, isSubscriber) => {
    const bonus = isSubscriber ? Math.floor(pack.total * SUBSCRIBER_BONUS) : 0;
    return { base: pack.total, subscriberBonus: bonus, grand: pack.total + bonus };
  },
};

module.exports = Credit;
