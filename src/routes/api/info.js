const express = require('express');
const router  = express.Router();
const axios   = require('axios');

router.get('/country', async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ success: false, error: '`name` query param is required.' });
  try {
    const { data } = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fullText=false`, { timeout: 6000 });
    const c = data[0];
    res.json({
      success: true,
      data: {
        name:        c.name.common,
        official:    c.name.official,
        capital:     c.capital?.[0] || null,
        region:      c.region,
        subregion:   c.subregion,
        population:  c.population,
        area_km2:    c.area,
        currencies:  c.currencies,
        languages:   c.languages,
        flag_emoji:  c.flag,
        flag_url:    c.flags?.png,
        timezones:   c.timezones,
        calling_code:c.idd?.root + (c.idd?.suffixes?.[0] || ''),
        tld:         c.tld,
      },
    });
  } catch {
    res.status(404).json({ success: false, error: `Country "${name}" not found.` });
  }
});

router.get('/currency', async (req, res) => {
  const base = (req.query.base || 'USD').toUpperCase();
  try {
    const { data } = await axios.get(`https://open.er-api.com/v6/latest/${base}`, { timeout: 6000 });
    if (data.result === 'error') throw new Error(data['error-type']);
    res.json({
      success: true,
      data: {
        base,
        date:  data.time_last_update_utc,
        rates: data.rates,
      },
    });
  } catch {
    res.status(502).json({ success: false, error: `Could not fetch rates for ${base}. Check currency code.` });
  }
});

module.exports = router;
