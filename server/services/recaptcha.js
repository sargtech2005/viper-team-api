const axios = require('axios');

async function verifyRecaptcha(token) {
  if (!token) return false;
  try {
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: token } }
    );
    return data.success === true;
  } catch {
    return false;
  }
}

module.exports = { verifyRecaptcha };
