const { query } = require('../config/db');

const Plan = {
  all: async () => {
    const r = await query(`SELECT * FROM plans WHERE is_active = true ORDER BY price_ngn ASC`);
    return r.rows;
  },

  findById: async (id) => {
    const r = await query(`SELECT * FROM plans WHERE id = $1`, [id]);
    return r.rows[0] || null;
  },

  findByName: async (name) => {
    const r = await query(`SELECT * FROM plans WHERE name = $1`, [name]);
    return r.rows[0] || null;
  },
};

module.exports = Plan;
