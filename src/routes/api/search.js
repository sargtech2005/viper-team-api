const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// ─── Wikipedia ────────────────────────────────────────────────────────────────
router.get('/wikipedia', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ success: false, error: '`q` query param is required.' });

  try {
    const { data } = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        prop: 'extracts|pageimages|info',
        exintro: true,
        explaintext: true,
        redirects: 1,
        titles: q,
        inprop: 'url',
        pithumbsize: 400,
        origin: '*',
      },
      timeout: 8000,
    });

    const pages = data.query.pages;
    const page  = Object.values(pages)[0];

    if (page.missing !== undefined || !page.extract) {
      return res.status(404).json({ success: false, error: `No Wikipedia article found for "${q}".` });
    }

    const extract = page.extract.slice(0, 800).trim() + (page.extract.length > 800 ? '...' : '');

    res.json({
      success: true,
      data: {
        title:     page.title,
        summary:   extract,
        url:       page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        thumbnail: page.thumbnail?.source || null,
        pageid:    page.pageid,
      },
    });
  } catch (err) {
    res.status(502).json({ success: false, error: 'Wikipedia search unavailable. Try again.' });
  }
});

module.exports = router;
