const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendPasswordReset, sendWelcome } = require('../config/mailer');
const { verifyRecaptcha } = require('../config/recaptcha');

// ─── Cookie helper ────────────────────────────────────────────────────────────
const setAuthCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  res.cookie('viper_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ─── GET /register ────────────────────────────────────────────────────────────
exports.getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Create Account — Viper-Team API',
    error: null,
    success: null,
    formData: {},
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
  });
};

// ─── POST /register ───────────────────────────────────────────────────────────
exports.postRegister = async (req, res) => {
  const { username, email, password, confirm_password } = req.body;
  const recaptchaToken = req.body['g-recaptcha-response'];

  const renderError = (msg, data = {}) =>
    res.render('auth/register', {
      title: 'Create Account — Viper-Team API',
      error: msg,
      success: null,
      formData: { username, email },
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
      ...data,
    });

  // Validate
  if (!username || !email || !password || !confirm_password) {
    return renderError('All fields are required.');
  }
  if (username.length < 3 || username.length > 30) {
    return renderError('Username must be 3–30 characters.');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return renderError('Username can only contain letters, numbers, and underscores.');
  }
  if (password.length < 8) {
    return renderError('Password must be at least 8 characters.');
  }
  if (password !== confirm_password) {
    return renderError('Passwords do not match.');
  }

  // reCAPTCHA
  const captchaOk = await verifyRecaptcha(recaptchaToken);
  if (!captchaOk) {
    return renderError('Please complete the reCAPTCHA verification.');
  }

  try {
    // Check existing
    const emailExists = await User.findByEmail(email);
    if (emailExists) return renderError('An account with this email already exists.');

    const usernameExists = await User.findByUsername(username);
    if (usernameExists) return renderError('This username is already taken.');

    // Create user
    const user = await User.create({ username, email, password });

    // Auto-promote admin
    await User.promoteToAdminIfNeeded(user.id, email);

    // Send welcome email (non-blocking)
    sendWelcome(email, username).catch(console.error);

    // Log them in immediately
    setAuthCookie(res, user.id);
    return res.redirect('/dashboard?welcome=1');
  } catch (err) {
    console.error('Register error:', err);
    return renderError('Something went wrong. Please try again.');
  }
};

// ─── GET /login ───────────────────────────────────────────────────────────────
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Sign In — Viper-Team API',
    error: null,
    success: req.query.reset === '1' ? 'Password reset successful. Please log in.' : null,
    formData: {},
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
  });
};

// ─── POST /login ──────────────────────────────────────────────────────────────
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  const recaptchaToken = req.body['g-recaptcha-response'];

  const renderError = (msg) =>
    res.render('auth/login', {
      title: 'Sign In — Viper-Team API',
      error: msg,
      success: null,
      formData: { email },
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
    });

  if (!email || !password) {
    return renderError('Email and password are required.');
  }

  const captchaOk = await verifyRecaptcha(recaptchaToken);
  if (!captchaOk) {
    return renderError('Please complete the reCAPTCHA verification.');
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) return renderError('Invalid email or password.');

    const match = await User.verifyPassword(password, user.password_hash);
    if (!match) return renderError('Invalid email or password.');

    if (!user.is_active) {
      return renderError('Your account has been suspended. Contact support.');
    }

    // Auto-promote admin if needed
    await User.promoteToAdminIfNeeded(user.id, email);

    setAuthCookie(res, user.id);
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    return renderError('Something went wrong. Please try again.');
  }
};

// ─── GET /forgot ──────────────────────────────────────────────────────────────
exports.getForgot = (req, res) => {
  res.render('auth/forgot', {
    title: 'Forgot Password — Viper-Team API',
    error: null,
    success: null,
  });
};

// ─── POST /forgot ─────────────────────────────────────────────────────────────
exports.postForgot = async (req, res) => {
  const { email } = req.body;

  const render = (error, success) =>
    res.render('auth/forgot', {
      title: 'Forgot Password — Viper-Team API',
      error,
      success,
    });

  if (!email) return render('Email address is required.', null);

  try {
    const user = await User.findByEmail(email);

    // Always show success to prevent email enumeration
    if (!user) {
      return render(null, 'If an account exists with that email, a reset link has been sent.');
    }

    const rawToken = await User.setResetToken(user.id);
    const resetLink = `${process.env.APP_URL}/reset-password?token=${rawToken}`;

    await sendPasswordReset(email, user.username, resetLink);

    return render(null, 'Password reset link sent! Check your inbox (and spam folder).');
  } catch (err) {
    console.error('Forgot password error:', err);
    return render('Something went wrong. Please try again.', null);
  }
};

// ─── GET /reset-password ──────────────────────────────────────────────────────
exports.getReset = async (req, res) => {
  const { token } = req.query;

  if (!token) return res.redirect('/forgot');

  const user = await User.findByResetToken(token);
  if (!user) {
    return res.render('auth/reset', {
      title: 'Reset Password — Viper-Team API',
      error: 'This reset link is invalid or has expired. Please request a new one.',
      success: null,
      validToken: false,
      token: '',
    });
  }

  res.render('auth/reset', {
    title: 'Reset Password — Viper-Team API',
    error: null,
    success: null,
    validToken: true,
    token,
  });
};

// ─── POST /reset-password ─────────────────────────────────────────────────────
exports.postReset = async (req, res) => {
  const { token, password, confirm_password } = req.body;

  const renderError = (msg) =>
    res.render('auth/reset', {
      title: 'Reset Password — Viper-Team API',
      error: msg,
      success: null,
      validToken: true,
      token,
    });

  if (!token || !password || !confirm_password) {
    return renderError('All fields are required.');
  }
  if (password.length < 8) {
    return renderError('Password must be at least 8 characters.');
  }
  if (password !== confirm_password) {
    return renderError('Passwords do not match.');
  }

  try {
    const user = await User.findByResetToken(token);
    if (!user) {
      return renderError('This reset link is invalid or has expired. Please request a new one.');
    }

    await User.resetPassword(user.id, password);
    return res.redirect('/login?reset=1');
  } catch (err) {
    console.error('Reset password error:', err);
    return renderError('Something went wrong. Please try again.');
  }
};

// ─── GET /logout ──────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('viper_token');
  res.redirect('/login');
};
