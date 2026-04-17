const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { query }  = require('../db');
const { sendEmail } = require('../services/email');
const { verifyRecaptcha } = require('../services/recaptcha');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function makeApiKey() {
  return 'viper_' + uuid().replace(/-/g, '').slice(0, 32);
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, recaptchaToken } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // reCAPTCHA check (if enabled)
    const { rows: settings } = await query(
      "SELECT value FROM site_settings WHERE key = 'recaptcha_enabled'"
    );
    if (settings[0]?.value === 'true') {
      const ok = await verifyRecaptcha(recaptchaToken);
      if (!ok) return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }

    // Duplicate check
    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const apiKey       = makeApiKey();
    const verifyToken  = uuid();
    const isAdmin      = email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();

    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, api_key, verify_token, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, plan, api_key, is_admin`,
      [name.trim(), email.toLowerCase(), passwordHash, apiKey, verifyToken, isAdmin]
    );

    const user = rows[0];

    // Send verification email (non-blocking)
    sendEmail({
      to: user.email,
      subject: 'Verify your Viper-Team API account',
      html: `
        <h2>Welcome to Viper-Team API, ${user.name}!</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${process.env.APP_URL}/verify-email?token=${verifyToken}" style="background:#00e87a;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Verify Email
        </a>
        <p>If you didn't sign up, ignore this email.</p>
      `,
    }).catch(console.error);

    const token = makeToken(user.id);
    res.cookie('token', token, COOKIE_OPTS);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.is_active)
      return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const token = makeToken(user.id);
    res.cookie('token', token, COOKIE_OPTS);

    const { password_hash, verify_token, reset_token, reset_expires, ...safe } = user;
    res.json({ user: safe, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7));
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      'SELECT id, name, email, plan, api_key, credits_remaining, credits_used, credits_reset_at, is_admin, email_verified, created_at FROM users WHERE id = $1',
      [payload.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
});

// ── GET /api/auth/verify-email ────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  const { rowCount } = await query(
    'UPDATE users SET email_verified = true, verify_token = NULL WHERE verify_token = $1',
    [token]
  );
  if (!rowCount) return res.status(400).json({ error: 'Invalid or already used token' });
  res.json({ message: 'Email verified successfully' });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const resetToken   = uuid();
  const resetExpires = new Date(Date.now() + 3600 * 1000); // 1h

  const { rowCount } = await query(
    'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3',
    [resetToken, resetExpires, email.toLowerCase()]
  );

  // Always return success to prevent email enumeration
  if (rowCount) {
    sendEmail({
      to: email,
      subject: 'Reset your Viper-Team API password',
      html: `
        <h2>Password Reset</h2>
        <p>Click below to reset your password. This link expires in 1 hour.</p>
        <a href="${process.env.APP_URL}/reset-password?token=${resetToken}" style="background:#00e87a;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
      `,
    }).catch(console.error);
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
  if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const hash = await bcrypt.hash(password, 12);
  const { rowCount } = await query(
    `UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL
     WHERE reset_token = $2 AND reset_expires > NOW()`,
    [hash, token]
  );

  if (!rowCount) return res.status(400).json({ error: 'Invalid or expired reset link' });
  res.json({ message: 'Password reset successfully. You can now log in.' });
});

module.exports = router;
