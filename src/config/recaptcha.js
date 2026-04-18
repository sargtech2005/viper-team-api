const axios = require('axios');

/**
 * Verify a Google reCAPTCHA v2 token
 * @param {string} token - The g-recaptcha-response from the form
 * @returns {Promise<boolean>}
 */
const verifyRecaptcha = async (token) => {
  // Skip if no keys configured OR in development
  if (!process.env.RECAPTCHA_SECRET_KEY || !process.env.RECAPTCHA_SITE_KEY) return true;
  if (process.env.NODE_ENV === 'development') return true;

  // If keys are set but token is empty, fail
  if (!token) return false;

  try {
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        },
        timeout: 5000,
      }
    );
    return data.success === true;
  } catch (err) {
    console.error('reCAPTCHA verify error:', err.message);
    return false;
  }
};

module.exports = { verifyRecaptcha };
