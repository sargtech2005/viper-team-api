const { getSetting } = require('../config/settings');

/**
 * Maintenance mode middleware.
 * Skips admin, health, startup, and API routes so admins can still manage the site.
 */
const maintenanceCheck = async (req, res, next) => {
  // Always allow these paths through
  const bypass = ['/admin', '/health', '/startup', '/api/'];
  if (bypass.some(p => req.path.startsWith(p))) return next();

  try {
    const mode = await getSetting('MAINTENANCE_MODE', 'off');
    if (mode !== 'on') return next();

    // Allow logged-in admins through
    const token = req.cookies?.token;
    if (token) {
      try {
        const jwt  = require('jsonwebtoken');
        const { query } = require('../config/db');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const u = await query('SELECT role FROM users WHERE id = $1', [decoded.id]);
        if (u.rows[0]?.role === 'admin') return next();
      } catch (_) { /* not a valid admin session */ }
    }

    res.status(503).render('error', {
      title: 'Under Maintenance',
      code: 503,
      message: 'We\'re performing scheduled maintenance. We\'ll be back shortly.',
    });
  } catch {
    next();
  }
};

module.exports = { maintenanceCheck };
