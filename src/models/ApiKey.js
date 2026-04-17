const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const ApiKey = {
  generate: async (userId, label = 'My API Key') => {
    // Format: viper_<32 random hex chars>
    const raw = `viper_${crypto.randomBytes(20).toString('hex')}`;
    const r = await query(
      `INSERT INTO api_keys (user_id, key_value, label) VALUES ($1, $2, $3) RETURNING *`,
      [userId, raw, label]
    );
    return r.rows[0];
  },

  listByUser: async (userId) => {
    const r = await query(
      `SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return r.rows;
  },

  deactivate: async (keyId, userId) => {
    await query(
      `UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    );
  },

  delete: async (keyId, userId) => {
    await query(
      `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    );
  },

  countByUser: async (userId) => {
    const r = await query(
      `SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    return parseInt(r.rows[0].count);
  },
};

module.exports = ApiKey;
