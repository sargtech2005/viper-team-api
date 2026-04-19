/**
 * /api/v1/news — News Headlines
 *
 * GET /api/v1/news/top?category=technology&country=ng&lang=en
 * GET /api/v1/news/search?q=bitcoin&lang=en
 * GET /api/v1/news/sources
 *
 * Powered by GNews API — free tier: 100 req/day, no credit card
 * Sign up at: https://gnews.io → copy your API key
 *
 * Fallback (no key): NewsData.io also has a free tier
 * Sign up at: https://newsdata.io
 *
 * Add to .env:
 *   GNEWS_API_KEY=your_key_here
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const fail = (res, msg, code = 400) => res.status(code).json({ success: false, error: msg });

function noKey(res) {
  return res.status(503).json({
    success: false,
    error:   'GNEWS_API_KEY is not configured.',
    setup:   'Sign up free at https://gnews.io, copy your API key, and add GNEWS_API_KEY=your_key to your .env file (or Render environment variables).',
  });
}

/* ── GET /top?category=general&country=ng&lang=en&limit=10 ── */
router.get('/top', async (req, res) => {
  if (!process.env.GNEWS_API_KEY) return noKey(res);
  const { category = 'general', country = 'ng', lang = 'en', limit = 10 } = req.query;
  const validCats = ['general','world','nation','business','technology','entertainment','sports','science','health'];
  if (!validCats.includes(category)) return fail(res, `category must be one of: ${validCats.join(', ')}`);

  try {
    const { data } = await axios.get('https://gnews.io/api/v4/top-headlines', {
      params: { category, country, lang, max: Math.min(parseInt(limit)||10, 10), apikey: process.env.GNEWS_API_KEY },
      timeout: 10000,
    });
    res.json({
      success: true, category, country, language: lang,
      total: data.totalArticles || data.articles?.length || 0,
      articles: (data.articles || []).map(a => ({
        title:       a.title,
        description: a.description,
        source:      a.source?.name || null,
        url:         a.url,
        image:       a.image || null,
        published:   a.publishedAt,
      })),
    });
  } catch (e) {
    if (e.response?.status === 403) return fail(res, 'Invalid or expired GNEWS_API_KEY', 403);
    if (e.response?.status === 429) return fail(res, 'Daily limit reached (100 req/day on free tier). Upgrade at gnews.io or wait until tomorrow.', 429);
    fail(res, 'News fetch failed: ' + e.message, 500);
  }
});

/* ── GET /search?q=bitcoin&lang=en&limit=10 ── */
router.get('/search', async (req, res) => {
  if (!process.env.GNEWS_API_KEY) return noKey(res);
  const { q, lang = 'en', limit = 10, from, to } = req.query;
  if (!q) return fail(res, 'q (search query) is required');

  const params = { q, lang, max: Math.min(parseInt(limit)||10, 10), apikey: process.env.GNEWS_API_KEY };
  if (from) params.from = from;
  if (to)   params.to   = to;

  try {
    const { data } = await axios.get('https://gnews.io/api/v4/search', { params, timeout: 10000 });
    res.json({
      success: true, query: q, language: lang,
      total: data.totalArticles || data.articles?.length || 0,
      articles: (data.articles || []).map(a => ({
        title:       a.title,
        description: a.description,
        source:      a.source?.name || null,
        url:         a.url,
        image:       a.image || null,
        published:   a.publishedAt,
      })),
    });
  } catch (e) {
    if (e.response?.status === 403) return fail(res, 'Invalid or expired GNEWS_API_KEY', 403);
    if (e.response?.status === 429) return fail(res, 'Daily limit reached. Try again tomorrow.', 429);
    fail(res, 'News search failed: ' + e.message, 500);
  }
});

/* ── GET /sources — list of available news categories and countries ── */
router.get('/sources', (req, res) => {
  res.json({
    success: true,
    categories: ['general','world','nation','business','technology','entertainment','sports','science','health'],
    languages:  ['en','ar','zh','nl','fr','de','el','he','hi','it','ja','ml','mr','no','pt','ro','ru','sk','es','sv','ta','te','uk'],
    countries:  ['au','br','ca','cn','eg','fr','de','gr','hk','in','ie','il','it','jp','nl','no','pk','pe','ph','pt','ro','ru','sg','es','sv','us','ng','gb','za','ke','gh'],
    note: 'Pass any combination of category, country and lang to /top, or use /search for keyword-based headlines.',
  });
});

module.exports = router;
