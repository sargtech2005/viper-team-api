const jwt  = require('jsonwebtoken');
const { query } = require('../db');

// Attach user to req if valid token found (cookie or Bearer header)
async function authMiddleware(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7));

    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      'SELECT id, name, email, plan, api_key, credits_remaining, credits_used, is_admin, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account suspended' });

    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Require admin
async function adminMiddleware(req, res, next) {
  await authMiddleware(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

module.exports = { authMiddleware, adminMiddleware };
