const axios = require('axios');

const PAYSTACK_BASE = 'https://api.paystack.co';

function paystackHeaders() {
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' };
}

async function paystackInitialize({ email, amount, reference, metadata, callback_url }) {
  const { data } = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    { email, amount, reference, metadata, callback_url },
    { headers: paystackHeaders() }
  );
  if (!data.status) throw new Error(data.message || 'Paystack initialization failed');
  return data.data.authorization_url;
}

async function paystackVerify(reference) {
  const { data } = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeaders() }
  );
  return data.data;
}

module.exports = { paystackInitialize, paystackVerify };
