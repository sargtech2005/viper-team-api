/**
 * /api/v1/detect — Smart Detection
 * Endpoints: /sentiment  /language  /profanity  /spam
 *
 * npm install sentiment franc@5 langs bad-words
 */

const express   = require('express');
const router    = express.Router();
const Sentiment = require('sentiment');
const franc     = require('franc');          // franc v5 = CommonJS
const langs     = require('langs');
const BadWords  = require('bad-words');

const sentimentAnalyzer = new Sentiment();
const profanityFilter   = new BadWords();

/* ──────────────────────────────────────────────────────
   POST /api/v1/detect/sentiment
   Body: { "text": "I love this product!" }
   ────────────────────────────────────────────────────── */
router.post('/sentiment', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text is required' });
  if (text.length > 5000) return res.status(400).json({ success: false, error: 'text too long (max 5000 chars)' });

  const result = sentimentAnalyzer.analyze(text);

  let label = 'neutral';
  if (result.score > 1)  label = 'positive';
  if (result.score < -1) label = 'negative';

  res.json({
    success: true,
    label,
    score: result.score,
    comparative: parseFloat(result.comparative.toFixed(4)),
    positive_words: result.positive,
    negative_words: result.negative,
    word_count: result.tokens.length,
  });
});

/* ──────────────────────────────────────────────────────
   POST /api/v1/detect/language
   Body: { "text": "Bonjour tout le monde" }
   ────────────────────────────────────────────────────── */
router.post('/language', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text is required' });
  if (text.length < 10) return res.status(400).json({ success: false, error: 'text too short — need at least 10 characters for accuracy' });

  const code3 = franc(text, { minLength: 10 });

  if (code3 === 'und') {
    return res.json({ success: true, detected: false, reason: 'Could not determine language — text too ambiguous or too short' });
  }

  const lang = langs.where('3', code3);
  res.json({
    success: true,
    detected: true,
    iso_639_3: code3,
    iso_639_1: lang ? lang['1'] : null,
    language: lang ? lang.name : 'Unknown',
    local_name: lang ? lang.local : null,
  });
});

/* ──────────────────────────────────────────────────────
   POST /api/v1/detect/profanity
   Body: { "text": "This is a clean sentence" }
   ────────────────────────────────────────────────────── */
router.post('/profanity', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text is required' });

  let isProfane = false;
  let cleaned   = text;

  try {
    isProfane = profanityFilter.isProfane(text);
    cleaned   = profanityFilter.clean(text);
  } catch (_) {
    // bad-words throws if no words detected in some edge cases — safe to ignore
  }

  res.json({
    success: true,
    is_profane: isProfane,
    cleaned_text: cleaned,
    original: text,
  });
});

/* ──────────────────────────────────────────────────────
   POST /api/v1/detect/spam
   Body: { "text": "Congratulations! You won a free prize!" }
   Heuristic scorer — no external API needed
   ────────────────────────────────────────────────────── */
router.post('/spam', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text is required' });

  const spamKeywords = [
    'free', 'winner', 'won', 'click here', 'buy now', 'limited time',
    'act now', 'earn money', 'make money', 'risk free', 'guarantee',
    'no cost', 'prize', 'congratulations', 'urgent', 'cash bonus',
    'discount', 'dear friend', 'nigerian prince', 'investment opportunity',
    'double your', 'get rich', 'work from home', 'extra income',
    'you have been selected', 'claim your', 'verify your account',
    '100% free', 'no credit card', 'unsubscribe', 'click below',
    'weight loss', 'enlarge', 'pills', 'pharmacy',
  ];

  const lower        = text.toLowerCase();
  const matched      = spamKeywords.filter(k => lower.includes(k));
  const capsRatio    = (text.replace(/[^A-Z]/g, '').length / Math.max(text.replace(/[^a-zA-Z]/g, '').length, 1));
  const exclCount    = (text.match(/!/g) || []).length;
  const urlCount     = (text.match(/https?:\/\//g) || []).length;

  let score = Math.min(50, matched.length * 6);
  if (capsRatio > 0.4) score += 15;
  if (exclCount > 3)   score += 10;
  if (urlCount > 2)    score += 10;
  score = Math.min(100, score);

  let verdict = 'clean';
  if (score >= 25 && score < 55) verdict = 'suspicious';
  if (score >= 55)               verdict = 'spam';

  res.json({
    success: true,
    verdict,
    spam_score: score,
    signals: {
      matched_keywords: matched,
      excessive_caps: capsRatio > 0.4,
      excessive_exclamation: exclCount > 3,
      multiple_urls: urlCount > 2,
    },
  });
});

module.exports = router;
