const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

const User = {
  // ─── Find ──────────────────────────────────────────────────────────────────

  findById: async (id) => {
    const r = await query('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  findByEmail: async (email) => {
    const r = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return r.rows[0] || null;
  },

  findByUsername: async (username) => {
    const r = await query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    return r.rows[0] || null;
  },

  findByResetToken: async (rawToken) => {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const r = await query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [hashed]
    );
    return r.rows[0] || null;
  },

  // ─── Create ────────────────────────────────────────────────────────────────

  create: async ({ username, email, password }) => {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Get default free plan
    const planResult = await query("SELECT id FROM plans WHERE name = 'Free' LIMIT 1");
    const planId = planResult.rows[0]?.id || null;

    const r = await query(
      `INSERT INTO users (username, email, password_hash, role, plan_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [username.toLowerCase(), email.toLowerCase(), hash, 'user', planId]
    );
    return r.rows[0];
  },

  // ─── Auth ──────────────────────────────────────────────────────────────────

  verifyPassword: async (plain, hash) => {
    return bcrypt.compare(plain, hash);
  },

  // ─── Password Reset ────────────────────────────────────────────────────────

  setResetToken: async (userId) => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [hashed, expires, userId]
    );

    return rawToken; // return raw — only hashed version stored in DB
  },

  resetPassword: async (userId, newPassword) => {
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, userId]
    );
  },

  // ─── Admin auto-promote ────────────────────────────────────────────────────

  promoteToAdminIfNeeded: async (userId, email) => {
    if (email === process.env.ADMIN_EMAIL) {
      await query("UPDATE users SET role = 'admin' WHERE id = $1 AND role != 'admin'", [userId]);
    }
  },

  // ─── Profile Updates ────────────────────────────────────────────────────────

  updateProfile: async (userId, { displayName, email }) => {
    const r = await query(
      `UPDATE users SET display_name=$1, email=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [displayName || null, email.toLowerCase(), userId]
    );
    return r.rows[0] || null;
  },

  updateAvatar: async (userId, avatarUrl) => {
    const r = await query(
      `UPDATE users SET avatar_url=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [avatarUrl, userId]
    );
    return r.rows[0] || null;
  },

  updatePassword: async (userId, newPassword) => {
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query(
      `UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`,
      [hash, userId]
    );
  },

  deleteAccount: async (userId) => {
    await query(`DELETE FROM users WHERE id=$1`, [userId]);
  },

};

module.exports = User;
