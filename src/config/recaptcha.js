const axios = require('axios');

/**
 * Verify a Google reCAPTCHA v2 token
 * @param {string} token - The g-recaptcha-response from the form
 * @returns {Promise<boolean>}
 */
const verifyRecaptcha = async (token) => {
  // Skip in development if no key is set
  if (!process.env.RECAPTCHA_SECRET_KEY || process.env.NODE_ENV === 'development') {
    return true;
  }

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
