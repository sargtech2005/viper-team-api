const { query } = require('../config/db');

const SUBSCRIBER_BONUS_DEFAULT = 0.20; // fallback if not in DB

// ── Auto-create credit_packs table + seed defaults if missing ─────────────────
// Mirrors settings.js pattern so credit_packs always exists on first access,
// even when /startup was run before this migration was added.
let _tableReady = false;
async function ensureCreditPacksTable() {
  if (_tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS credit_packs (
      id          SERIAL PRIMARY KEY,
      pack_id     VARCHAR(30)  NOT NULL UNIQUE,
      label       VARCHAR(50)  NOT NULL,
      price_ngn   INTEGER      NOT NULL DEFAULT 500,
      base        INTEGER      NOT NULL DEFAULT 600,
      bonus       INTEGER      NOT NULL DEFAULT 0,
      bonus_pct   INTEGER      NOT NULL DEFAULT 0,
      is_active   BOOLEAN      NOT NULL DEFAULT true,
      sort_order  INTEGER      NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    INSERT INTO credit_packs (pack_id, label, price_ngn, base, bonus, bonus_pct, sort_order) VALUES
      ('topup',  'Top-up',  500,   600,   0,     0,  1),
      ('bundle', 'Bundle',  2000,  3000,  450,   15, 2),
      ('stack',  'Stack',   7500,  15000, 3750,  25, 3),
      ('bulk',   'Bulk',    20000, 50000, 17500, 35, 4)
    ON CONFLICT (pack_id) DO NOTHING
  `);
  // Also ensure the SUBSCRIBER_BONUS_PCT setting row exists
  try {
    await query(`
      INSERT INTO settings (key, value) VALUES ('SUBSCRIBER_BONUS_PCT', '20')
      ON CONFLICT (key) DO NOTHING
    `);
  } catch (_) { /* settings table may not exist yet — getSetting handles fallback */ }
  _tableReady = true;
}

const Credit = {

  // ─── Pack CRUD (DB-backed) ──────────────────────────────────────────────────

  allPacks: async () => {
    await ensureCreditPacksTable();
    const r = await query(
      `SELECT *, (base + bonus) AS total FROM credit_packs ORDER BY sort_order ASC, id ASC`
    );
    return r.rows.map(p => ({
      ...p,
      total:   p.base + p.bonus,
      perCall: p.price_ngn / (p.base + p.bonus || 1),
    }));
  },

  activePacks: async () => {
    await ensureCreditPacksTable();
    const r = await query(
      `SELECT *, (base + bonus) AS total FROM credit_packs WHERE is_active = true ORDER BY sort_order ASC, id ASC`
    );
    return r.rows.map(p => ({
      ...p,
      total:   p.base + p.bonus,
      price:   p.price_ngn,       // billing.ejs uses pack.price
      id:      p.pack_id,         // billing.ejs passes this as pack_id to verify endpoint
      dbId:    p.id,              // keep integer PK if needed
      perCall: (p.price_ngn / (p.base + p.bonus || 1)).toFixed(3),
    }));
  },

  findPack: async (packId) => {
    await ensureCreditPacksTable();
    const r = await query(
      `SELECT *, (base + bonus) AS total FROM credit_packs WHERE pack_id = $1`,
      [packId]
    );
    if (!r.rows[0]) return null;
    const p = r.rows[0];
    return {
      ...p,
      id:      p.pack_id,       // keep old interface (id = pack_id string)
      total:   p.base + p.bonus,
      price:   p.price_ngn,     // old interface used .price
      perCall: p.price_ngn / (p.base + p.bonus || 1),
    };
  },

  findPackById: async (dbId) => {
    await ensureCreditPacksTable();
    const r = await query(
      `SELECT *, (base + bonus) AS total FROM credit_packs WHERE id = $1`,
      [dbId]
    );
    if (!r.rows[0]) return null;
    const p = r.rows[0];
    return { ...p, total: p.base + p.bonus, price: p.price_ngn, perCall: p.price_ngn / (p.base + p.bonus || 1) };
  },

  createPack: async ({ packId, label, priceNgn, base, bonus, bonusPct, sortOrder }) => {
    await ensureCreditPacksTable();
    const r = await query(
      `INSERT INTO credit_packs (pack_id, label, price_ngn, base, bonus, bonus_pct, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [packId, label, priceNgn, base, bonus, bonusPct, sortOrder || 0]
    );
    return r.rows[0];
  },

  updatePack: async (id, { label, priceNgn, base, bonus, bonusPct, isActive, sortOrder }) => {
    const r = await query(
      `UPDATE credit_packs SET
         label = $1, price_ngn = $2, base = $3, bonus = $4,
         bonus_pct = $5, is_active = $6, sort_order = $7
       WHERE id = $8 RETURNING *`,
      [label, priceNgn, base, bonus, bonusPct, isActive, sortOrder, id]
    );
    return r.rows[0];
  },

  deletePack: async (id) => {
    const r = await query(`DELETE FROM credit_packs WHERE id = $1 RETURNING id`, [id]);
    return r.rows[0];
  },

  // ─── Balance & Transactions ─────────────────────────────────────────────────

  getBalance: async (userId) => {
    const r = await query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
    return r.rows[0]?.credit_balance ?? 0;
  },

  adjustBalance: async (userId, amount, type, description, paystackRef = null) => {
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
    const r = await query(
      `INSERT INTO credit_transactions (user_id, type, amount, description, paystack_ref)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, amount, description, paystackRef]
    );
    return r.rows[0];
  },

  refAlreadyUsed: async (paystackRef) => {
    const r = await query(
      'SELECT id FROM credit_transactions WHERE paystack_ref = $1 AND type = $2',
      [paystackRef, 'topup']
    );
    return r.rows.length > 0;
  },

  listTransactions: async (userId, limit = 20) => {
    const r = await query(
      `SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return r.rows;
  },

  // ─── Subscriber bonus ───────────────────────────────────────────────────────

  getSubscriberBonus: async () => {
    try {
      const { getSetting } = require('../config/settings');
      const val = await getSetting('SUBSCRIBER_BONUS_PCT', '20');
      return parseInt(val) / 100 || SUBSCRIBER_BONUS_DEFAULT;
    } catch {
      return SUBSCRIBER_BONUS_DEFAULT;
    }
  },

  calcCredits: async (pack, isSubscriber) => {
    const bonusPct = isSubscriber ? await Credit.getSubscriberBonus() : 0;
    const subBonus = isSubscriber ? Math.floor(pack.total * bonusPct) : 0;
    return { base: pack.total, subscriberBonus: subBonus, grand: pack.total + subBonus };
  },
};

module.exports = Credit;
