const axios = require('axios');
const { getSetting } = require('./settings');

/**
 * Verify a Google reCAPTCHA v2 token.
 * Keys are read from DB (via getSetting) with .env as fallback.
 */
const verifyRecaptcha = async (token) => {
  if (process.env.NODE_ENV === 'development') return true;

  const siteKey   = await getSetting('RECAPTCHA_SITE_KEY',   process.env.RECAPTCHA_SITE_KEY   || '');
  const secretKey = await getSetting('RECAPTCHA_SECRET_KEY', process.env.RECAPTCHA_SECRET_KEY || '');

  // Skip if neither key is configured
  if (!secretKey || !siteKey) return true;

  // Keys configured but token missing → fail
  if (!token) return false;

  try {
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: secretKey, response: token }, timeout: 5000 }
    );
    return data.success === true;
  } catch (err) {
    console.error('reCAPTCHA verify error:', err.message);
    return false;
  }
};

module.exports = { verifyRecaptcha };
