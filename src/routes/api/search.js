const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// Wikipedia requires a descriptive User-Agent for server-side API access.
// Bare requests (no UA) are blocked — that is what was causing the 502.
const WP_UA = 'ViperAPI/1.0 (https://viper-api.name.ng; contact@viper-api.name.ng) axios/node';

// ─── Wikipedia ────────────────────────────────────────────────────────────────
router.get('/wikipedia', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ success: false, error: '`q` query param is required.' });

  try {
    const { data } = await axios.get('https://en.wikipedia.org/w/api.php', {
      headers: { 'User-Agent': WP_UA },
      params: {
        action:      'query',
        format:      'json',
        prop:        'extracts|pageimages|info',
        exintro:     true,
        explaintext: true,
        redirects:   1,
        titles:      q,
        inprop:      'url',
        pithumbsize: 400,
      },
      timeout: 10000,
    });

    const pages = data?.query?.pages;
    if (!pages) {
      return res.status(502).json({ success: false, error: 'Unexpected response from Wikipedia.' });
    }

    const page = Object.values(pages)[0];

    // Missing article
    if (page.missing !== undefined) {
      return res.status(404).json({ success: false, error: `No Wikipedia article found for "${q}".` });
    }

    // Disambiguation or no extract (e.g. redirect-only pages)
    if (!page.extract || page.extract.trim() === '') {
      return res.status(404).json({ success: false, error: `Wikipedia article for "${q}" has no readable summary. Try a more specific query.` });
    }

    const summary = page.extract.length > 800
      ? page.extract.slice(0, 800).trim() + '...'
      : page.extract.trim();

    res.json({
      success: true,
      data: {
        title:     page.title,
        summary,
        url:       page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        thumbnail: page.thumbnail?.source || null,
        pageid:    page.pageid,
      },
    });

  } catch (err) {
    const status = err.response?.status;
    const msg    = err.code === 'ECONNABORTED'
      ? 'Wikipedia request timed out. Try again.'
      : status
        ? `Wikipedia returned HTTP ${status}.`
        : 'Could not reach Wikipedia. Try again.';

    console.error('[/wikipedia] error:', err.code || status || err.message);
    res.status(502).json({ success: false, error: msg });
  }
});

module.exports = router;
