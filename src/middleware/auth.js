const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * requireAuth — blocks unauthenticated users, redirects to /login
 */
const requireAuth = async (req, res, next) => {
  const token = req.cookies.viper_token;
  if (!token) return res.redirect('/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, username, email, role, plan_id, api_calls_used, credit_balance, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      res.clearCookie('viper_token');
      return res.redirect('/login');
    }

    req.user = result.rows[0];
    res.locals.user = result.rows[0];
    next();
  } catch (err) {
    res.clearCookie('viper_token');
    return res.redirect('/login');
  }
};

/**
 * optionalAuth — attaches user if logged in, never blocks
 */
const optionalAuth = async (req, res, next) => {
  const token = req.cookies.viper_token;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, username, email, role, plan_id, api_calls_used, credit_balance, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length && result.rows[0].is_active) {
      req.user = result.rows[0];
      res.locals.user = result.rows[0];
    }
  } catch (_) {
    res.clearCookie('viper_token');
  }
  next();
};

/**
 * redirectIfAuth — redirects logged-in users away from auth pages
 */
const redirectIfAuth = (req, res, next) => {
  const token = req.cookies.viper_token;
  if (!token) return next();

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.redirect('/dashboard');
  } catch (_) {
    res.clearCookie('viper_token');
    next();
  }
};

module.exports = { requireAuth, optionalAuth, redirectIfAuth };
