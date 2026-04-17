/**
 * adminOnly — must be used AFTER requireAuth middleware
 * Denies access to non-admin users
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: '403 — Forbidden',
      code: 403,
      message: 'You do not have permission to access this page.',
    });
  }
  next();
};

module.exports = { adminOnly };
