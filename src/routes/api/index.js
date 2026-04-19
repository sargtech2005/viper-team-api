/**
 * API Route Index — /api/v1/*
 * All routes require a valid API key (apiKeyCheck middleware).
 * Exception: /meta/health is also exposed publicly in app.js
 */

const express      = require('express');
const router       = express.Router();
const apiKeyCheck  = require('../../middleware/apiKeyCheck');

// All /api/v1/* routes require a valid API key
router.use(apiKeyCheck);

// ── Original endpoints ───────────────────────────────────────────
router.use('/utility',  require('./utility'));
router.use('/fun',      require('./fun'));
router.use('/search',   require('./search'));
router.use('/info',     require('./info'));
router.use('/media',    require('./media'));
router.use('/text',     require('./text'));
router.use('/number',   require('./number'));
router.use('/validate', require('./validate'));
router.use('/generate', require('./generate'));
router.use('/datetime', require('./datetime'));
router.use('/finance',  require('./finance'));

// ── New endpoints ────────────────────────────────────────────────
router.use('/network',  require('./network'));   // WHOIS, DNS, SSL, headers, ping, status
router.use('/detect',   require('./detect'));    // sentiment, language, profanity, spam
router.use('/image',    require('./image'));     // AI gen, screenshot, barcode, OG, resize
router.use('/data',     require('./data'));      // CSV/JSON/XML conversions, flatten, paginate
router.use('/weather',  require('./weather'));   // current, forecast
router.use('/notify',   require('./notify'));    // email, webhook
router.use('/spotify',  require('./spotify'));   // search, track, artist, album (+ 30s previews)
router.use('/meta',     require('./meta'));      // health, ping, endpoints catalog
router.use('/download',  require('./download'));  // TikTok, Instagram, Twitter, Facebook, YouTube
router.use('/host',      require('./host'));      // IP geo, domain lookup, reverse DNS, ports, tech stack
router.use('/crypto',    require('./crypto'));    // prices, top coins, history, convert, gas
router.use('/url',       require('./url'));       // shorten, expand, parse, safety check
router.use('/news',      require('./news'));      // top headlines, search (needs GNEWS_API_KEY)
router.use('/tempemail', require('./tempemail')); // generate temp email + read inbox
router.use('/color',     require('./color'));     // convert, name, contrast, random, mix
router.use('/code',      require('./code'));      // minify, format, count, escape/unescape

// ── Meta endpoint — returns caller's plan info ───────────────────
router.get('/me', (req, res) => {
  res.json({
    success:        true,
    plan:           req.apiUser.planName,
    api_limit:      req.apiUser.apiLimit,
    calls_used:     req.apiUser.callsUsed,
    calls_left:     req.apiUser.apiLimit - req.apiUser.callsUsed,
    credit_balance: req.apiUser.creditBalance,
  });
});

module.exports = router;
