/**
 * /api/v1/meta — API Meta Info
 * Endpoints: /health  /ping  /endpoints
 *
 * NOTE: /health is also registered as a PUBLIC route (no API key)
 *       in app.js — see install notes.
 *
 * No extra npm install needed.
 */

const express   = require('express');
const router    = express.Router();
const startTime = Date.now();

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/meta/health
   Returns API operational status and uptime.
   (Also register this as a public route in app.js — see README)
   ────────────────────────────────────────────────────────────────── */
router.get('/health', (req, res) => {
  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
  const h   = Math.floor(uptimeSec / 3600);
  const m   = Math.floor((uptimeSec % 3600) / 60);
  const s   = uptimeSec % 60;

  res.json({
    success:        true,
    status:         'operational',
    uptime:         `${h}h ${m}m ${s}s`,
    uptime_seconds: uptimeSec,
    node_version:   process.version,
    memory_mb:      Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp:      new Date().toISOString(),
  });
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/meta/ping
   Simple latency test endpoint. Returns pong + server timestamp.
   ────────────────────────────────────────────────────────────────── */
router.get('/ping', (req, res) => {
  res.json({
    success:   true,
    message:   'pong',
    timestamp: Date.now(),
    iso:       new Date().toISOString(),
  });
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/meta/endpoints
   Lists all available endpoints grouped by category.
   ────────────────────────────────────────────────────────────────── */
router.get('/endpoints', (req, res) => {
  const catalog = {
    utility: {
      description: 'General utility tools',
      endpoints: [
        { method: 'POST', path: '/api/v1/utility/qr',           desc: 'Generate QR code' },
        { method: 'POST', path: '/api/v1/utility/base64/encode', desc: 'Encode text to Base64' },
        { method: 'POST', path: '/api/v1/utility/base64/decode', desc: 'Decode Base64 text' },
        { method: 'GET',  path: '/api/v1/utility/uuid',          desc: 'Generate UUID v4' },
        { method: 'POST', path: '/api/v1/utility/password',      desc: 'Generate secure password' },
        { method: 'POST', path: '/api/v1/utility/slugify',       desc: 'Slugify text' },
        { method: 'POST', path: '/api/v1/utility/text/analyze',  desc: 'Analyze text stats' },
        { method: 'GET',  path: '/api/v1/utility/ip',            desc: 'Get caller IP info' },
      ],
    },
    text: {
      description: 'Text processing & extraction',
      endpoints: [
        { method: 'POST', path: '/api/v1/text/case',             desc: 'Change text case' },
        { method: 'POST', path: '/api/v1/text/truncate',         desc: 'Truncate text' },
        { method: 'POST', path: '/api/v1/text/reverse',          desc: 'Reverse text' },
        { method: 'GET',  path: '/api/v1/text/lorem',            desc: 'Generate lorem ipsum' },
        { method: 'POST', path: '/api/v1/text/palindrome',       desc: 'Check palindrome' },
        { method: 'POST', path: '/api/v1/text/count',            desc: 'Count words/chars' },
        { method: 'POST', path: '/api/v1/text/dedupe',           desc: 'Remove duplicates' },
        { method: 'POST', path: '/api/v1/text/extract/emails',   desc: 'Extract emails from text' },
        { method: 'POST', path: '/api/v1/text/extract/urls',     desc: 'Extract URLs from text' },
        { method: 'POST', path: '/api/v1/text/extract/numbers',  desc: 'Extract numbers from text' },
        { method: 'POST', path: '/api/v1/text/hash',             desc: 'Hash text (md5/sha256)' },
        { method: 'POST', path: '/api/v1/text/diff',             desc: 'Diff two strings' },
      ],
    },
    number: {
      description: 'Number operations & math',
      endpoints: [
        { method: 'GET',  path: '/api/v1/number/random',    desc: 'Generate random number' },
        { method: 'GET',  path: '/api/v1/number/words',     desc: 'Number to words' },
        { method: 'GET',  path: '/api/v1/number/roman',     desc: 'Number to Roman numeral' },
        { method: 'GET',  path: '/api/v1/number/fibonacci', desc: 'Fibonacci sequence' },
        { method: 'GET',  path: '/api/v1/number/prime',     desc: 'Check prime number' },
        { method: 'POST', path: '/api/v1/number/stats',     desc: 'Statistical analysis of array' },
        { method: 'GET',  path: '/api/v1/number/convert',   desc: 'Unit conversion' },
        { method: 'GET',  path: '/api/v1/number/bmi',       desc: 'BMI calculator' },
      ],
    },
    validate: {
      description: 'Validation tools',
      endpoints: [
        { method: 'POST', path: '/api/v1/validate/email',             desc: 'Validate email address' },
        { method: 'POST', path: '/api/v1/validate/url',               desc: 'Validate URL' },
        { method: 'POST', path: '/api/v1/validate/phone',             desc: 'Validate phone number' },
        { method: 'POST', path: '/api/v1/validate/credit-card',       desc: 'Validate credit card (Luhn)' },
        { method: 'POST', path: '/api/v1/validate/password-strength', desc: 'Check password strength' },
        { method: 'POST', path: '/api/v1/validate/color',             desc: 'Validate hex/rgb color' },
        { method: 'POST', path: '/api/v1/validate/json',              desc: 'Validate JSON string' },
        { method: 'POST', path: '/api/v1/validate/nin',               desc: 'Validate NIN (Nigeria)' },
        { method: 'POST', path: '/api/v1/validate/bvn',               desc: 'Validate BVN (Nigeria)' },
      ],
    },
    generate: {
      description: 'Random data generation',
      endpoints: [
        { method: 'GET', path: '/api/v1/generate/name',    desc: 'Generate random name' },
        { method: 'GET', path: '/api/v1/generate/address', desc: 'Generate random address' },
        { method: 'GET', path: '/api/v1/generate/otp',     desc: 'Generate OTP code' },
        { method: 'GET', path: '/api/v1/generate/token',   desc: 'Generate random token' },
        { method: 'GET', path: '/api/v1/generate/palette', desc: 'Generate color palette' },
        { method: 'GET', path: '/api/v1/generate/user',    desc: 'Generate fake user profile' },
      ],
    },
    datetime: {
      description: 'Date & time utilities',
      endpoints: [
        { method: 'GET', path: '/api/v1/datetime/now',         desc: 'Current time in any timezone' },
        { method: 'GET', path: '/api/v1/datetime/timestamp',   desc: 'Unix timestamp tools' },
        { method: 'GET', path: '/api/v1/datetime/diff',        desc: 'Difference between two dates' },
        { method: 'GET', path: '/api/v1/datetime/add',         desc: 'Add duration to date' },
        { method: 'GET', path: '/api/v1/datetime/format',      desc: 'Format a date string' },
        { method: 'GET', path: '/api/v1/datetime/businessday', desc: 'Business day calculator' },
      ],
    },
    finance: {
      description: 'Financial calculators',
      endpoints: [
        { method: 'GET', path: '/api/v1/finance/convert',  desc: 'Currency conversion' },
        { method: 'GET', path: '/api/v1/finance/loan',     desc: 'Loan repayment calculator' },
        { method: 'GET', path: '/api/v1/finance/compound', desc: 'Compound interest calculator' },
        { method: 'GET', path: '/api/v1/finance/vat',      desc: 'VAT calculator' },
        { method: 'GET', path: '/api/v1/finance/tip',      desc: 'Tip calculator' },
        { method: 'GET', path: '/api/v1/finance/discount', desc: 'Discount calculator' },
      ],
    },
    fun: {
      description: 'Fun & entertainment',
      endpoints: [
        { method: 'GET', path: '/api/v1/fun/joke',          desc: 'Random joke' },
        { method: 'GET', path: '/api/v1/fun/quote',         desc: 'Inspirational quote' },
        { method: 'GET', path: '/api/v1/fun/fact',          desc: 'Random fun fact' },
        { method: 'GET', path: '/api/v1/fun/trivia',        desc: 'Trivia question' },
        { method: 'GET', path: '/api/v1/fun/wouldyourather',desc: 'Would you rather question' },
        { method: 'GET', path: '/api/v1/fun/riddle',        desc: 'Random riddle' },
        { method: 'GET', path: '/api/v1/fun/coin',          desc: 'Flip a coin' },
        { method: 'GET', path: '/api/v1/fun/dice',          desc: 'Roll dice' },
        { method: 'GET', path: '/api/v1/fun/8ball',         desc: 'Magic 8 ball' },
      ],
    },
    search:   { description: 'Search engines',    endpoints: [{ method: 'GET', path: '/api/v1/search/wikipedia', desc: 'Search Wikipedia' }] },
    info:     { description: 'World info lookup', endpoints: [
      { method: 'GET', path: '/api/v1/info/country',  desc: 'Country info by name/code' },
      { method: 'GET', path: '/api/v1/info/currency', desc: 'Currency info' },
    ]},
    media:    { description: 'Media placeholders', endpoints: [
      { method: 'GET', path: '/api/v1/media/placeholder', desc: 'Placeholder image URL' },
      { method: 'GET', path: '/api/v1/media/avatar',      desc: 'Avatar image URL' },
    ]},
    // ─── NEW ENDPOINTS ───
    network: {
      description: 'Web & network diagnostic tools',
      endpoints: [
        { method: 'GET', path: '/api/v1/network/whois',   desc: 'WHOIS lookup for domain' },
        { method: 'GET', path: '/api/v1/network/dns',     desc: 'DNS record lookup (A/MX/TXT/NS...)' },
        { method: 'GET', path: '/api/v1/network/ssl',     desc: 'SSL certificate info & expiry' },
        { method: 'GET', path: '/api/v1/network/headers', desc: 'Fetch HTTP headers of any URL' },
        { method: 'GET', path: '/api/v1/network/status',  desc: 'Check if a URL is up or down' },
        { method: 'GET', path: '/api/v1/network/ping',    desc: 'Ping / DNS resolve a host' },
      ],
    },
    detect: {
      description: 'AI-powered content detection',
      endpoints: [
        { method: 'POST', path: '/api/v1/detect/sentiment', desc: 'Positive / negative / neutral score' },
        { method: 'POST', path: '/api/v1/detect/language',  desc: 'Detect language of any text' },
        { method: 'POST', path: '/api/v1/detect/profanity', desc: 'Profanity check & clean text' },
        { method: 'POST', path: '/api/v1/detect/spam',      desc: 'Spam score for text content' },
      ],
    },
    image: {
      description: 'Image generation & processing',
      endpoints: [
        { method: 'GET',  path: '/api/v1/image/generate',   desc: 'AI image generation (Pollinations.ai)' },
        { method: 'GET',  path: '/api/v1/image/screenshot', desc: 'Screenshot any URL' },
        { method: 'GET',  path: '/api/v1/image/barcode',    desc: 'Generate barcode (PNG)' },
        { method: 'GET',  path: '/api/v1/image/og',         desc: 'Generate Open Graph social image' },
        { method: 'POST', path: '/api/v1/image/resize',     desc: 'Resize image from URL' },
      ],
    },
    data: {
      description: 'Data format conversion & manipulation',
      endpoints: [
        { method: 'POST', path: '/api/v1/data/csv-to-json', desc: 'Convert CSV → JSON array' },
        { method: 'POST', path: '/api/v1/data/json-to-csv', desc: 'Convert JSON array → CSV' },
        { method: 'POST', path: '/api/v1/data/xml-to-json', desc: 'Convert XML → JSON' },
        { method: 'POST', path: '/api/v1/data/json-to-xml', desc: 'Convert JSON → XML' },
        { method: 'POST', path: '/api/v1/data/flatten',     desc: 'Flatten nested JSON object' },
        { method: 'POST', path: '/api/v1/data/paginate',    desc: 'Paginate any JSON array' },
      ],
    },
    weather: {
      description: 'Live weather data (OpenWeatherMap)',
      endpoints: [
        { method: 'GET', path: '/api/v1/weather/current',  desc: 'Current weather by city or coordinates' },
        { method: 'GET', path: '/api/v1/weather/forecast', desc: '5-day weather forecast' },
      ],
    },
    notify: {
      description: 'Send notifications',
      endpoints: [
        { method: 'POST', path: '/api/v1/notify/email',   desc: 'Send email via SMTP' },
        { method: 'POST', path: '/api/v1/notify/webhook', desc: 'Forward payload to any webhook URL' },
      ],
    },
    spotify: {
      description: 'Spotify music metadata (Spotify Web API)',
      endpoints: [
        { method: 'GET', path: '/api/v1/spotify/search', desc: 'Search tracks, artists, albums' },
        { method: 'GET', path: '/api/v1/spotify/track',  desc: 'Track info by Spotify ID' },
        { method: 'GET', path: '/api/v1/spotify/artist', desc: 'Artist info + top tracks' },
        { method: 'GET', path: '/api/v1/spotify/album',  desc: 'Album info + track list' },
      ],
    },
    meta: {
      description: 'API status & catalog',
      endpoints: [
        { method: 'GET', path: '/api/v1/meta/health',    desc: 'API health & uptime check' },
        { method: 'GET', path: '/api/v1/meta/ping',      desc: 'Latency test (returns pong)' },
        { method: 'GET', path: '/api/v1/meta/endpoints', desc: 'List all endpoints (this)' },
      ],
    },
  };

  const total = Object.values(catalog).reduce((sum, cat) => sum + cat.endpoints.length, 0);

  res.json({
    success:         true,
    total_endpoints: total,
    categories:      Object.keys(catalog).length,
    catalog,
  });
});

module.exports = router;
