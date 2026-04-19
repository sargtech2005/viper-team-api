/**
 * /api/v1/ai — AI Text Endpoints
 * Endpoints: /complete  /summarize  /grammar  /explain  /translate-tone
 *
 * Powered by Groq (free tier: 14,400 req/day, extremely fast llama3)
 * Get your free key at: https://console.groq.com
 * Add to .env:  GROQ_API_KEY=gsk_xxxx
 *
 * No extra npm install needed — uses existing axios.
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama3-8b-8192'; // Free, fast, 8k context

function getKey(res) {
  const k = process.env.GROQ_API_KEY;
  if (!k) {
    res.status(503).json({ success: false, error: 'AI service not configured. Add GROQ_API_KEY to .env (free at console.groq.com).' });
    return null;
  }
  return k;
}

async function groq(apiKey, systemPrompt, userContent, maxTokens = 512) {
  const { data } = await axios.post(GROQ_URL, {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  }, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 20000,
  });
  return data.choices[0].message.content.trim();
}

function fail(res, msg, code = 400) {
  return res.status(code).json({ success: false, error: msg });
}

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/ai/complete
   Body: { "prompt": "Write a tagline for a coffee shop", "max_tokens": 200 }
   ────────────────────────────────────────────────────────────────── */
router.post('/complete', async (req, res) => {
  const key = getKey(res); if (!key) return;
  const { prompt, max_tokens = 512 } = req.body;
  if (!prompt) return fail(res, 'prompt is required');
  if (prompt.length > 4000) return fail(res, 'prompt too long (max 4000 chars)');

  try {
    const result = await groq(key,
      'You are a helpful assistant. Be concise and direct.',
      prompt,
      Math.min(parseInt(max_tokens) || 512, 1024)
    );
    res.json({ success: true, result, model: MODEL, prompt_chars: prompt.length });
  } catch (e) {
    if (e.response?.status === 429) return fail(res, 'Groq rate limit hit — try again in a moment.', 429);
    fail(res, 'AI request failed: ' + (e.response?.data?.error?.message || e.message), 500);
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/ai/summarize
   Body: { "text": "Long article or passage...", "length": "short" }
   length: short | medium | long (default: medium)
   ────────────────────────────────────────────────────────────────── */
router.post('/summarize', async (req, res) => {
  const key = getKey(res); if (!key) return;
  const { text, length = 'medium' } = req.body;
  if (!text) return fail(res, 'text is required');
  if (text.length < 50) return fail(res, 'text too short to summarize (min 50 chars)');
  if (text.length > 8000) return fail(res, 'text too long (max 8000 chars)');

  const lengthMap = { short: '1-2 sentences', medium: '3-5 sentences', long: '2-3 paragraphs' };
  const target    = lengthMap[length] || lengthMap.medium;

  try {
    const summary = await groq(key,
      `Summarize the provided text in ${target}. Return only the summary — no preamble, no "Here is..." framing.`,
      text,
      length === 'long' ? 600 : length === 'short' ? 120 : 300
    );
    res.json({ success: true, summary, length, original_chars: text.length, summary_chars: summary.length });
  } catch (e) {
    if (e.response?.status === 429) return fail(res, 'Groq rate limit hit — try again in a moment.', 429);
    fail(res, 'AI request failed: ' + (e.response?.data?.error?.message || e.message), 500);
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/ai/grammar
   Body: { "text": "He dont know what he doing yesterday" }
   Returns corrected text + list of issues found.
   ────────────────────────────────────────────────────────────────── */
router.post('/grammar', async (req, res) => {
  const key = getKey(res); if (!key) return;
  const { text } = req.body;
  if (!text) return fail(res, 'text is required');
  if (text.length > 3000) return fail(res, 'text too long (max 3000 chars)');

  try {
    const raw = await groq(key,
      `You are a grammar correction assistant. Fix all grammar, spelling, and punctuation errors in the provided text.
Return your response as a JSON object with exactly these two fields:
- "corrected": the fully corrected text
- "issues": an array of short strings describing each issue found (e.g. ["Missing comma after 'however'", "\"dont\" → \"don't\""])
Return ONLY valid JSON — no markdown, no extra text.`,
      text,
      800
    );

    let corrected, issues;
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      corrected = parsed.corrected || text;
      issues    = Array.isArray(parsed.issues) ? parsed.issues : [];
    } catch {
      corrected = raw;
      issues    = [];
    }

    res.json({
      success:        true,
      original:       text,
      corrected,
      issues,
      issues_found:   issues.length,
      unchanged:      text === corrected,
    });
  } catch (e) {
    if (e.response?.status === 429) return fail(res, 'Groq rate limit hit — try again in a moment.', 429);
    fail(res, 'AI request failed: ' + (e.response?.data?.error?.message || e.message), 500);
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/ai/explain
   Body: { "text": "What is quantum entanglement?", "level": "simple" }
   level: simple | technical (default: simple)
   ────────────────────────────────────────────────────────────────── */
router.post('/explain', async (req, res) => {
  const key = getKey(res); if (!key) return;
  const { text, level = 'simple' } = req.body;
  if (!text) return fail(res, 'text is required');
  if (text.length > 2000) return fail(res, 'text too long (max 2000 chars)');

  const levelDesc = level === 'technical'
    ? 'Explain clearly with technical accuracy for a developer or expert audience.'
    : 'Explain in simple terms a 12-year-old could understand. Use analogies if helpful.';

  try {
    const explanation = await groq(key,
      `You are an expert explainer. ${levelDesc} Be concise and direct — no filler.`,
      text,
      600
    );
    res.json({ success: true, explanation, level, query: text });
  } catch (e) {
    if (e.response?.status === 429) return fail(res, 'Groq rate limit hit — try again in a moment.', 429);
    fail(res, 'AI request failed: ' + (e.response?.data?.error?.message || e.message), 500);
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/ai/tone
   Body: { "text": "hey can u fix this bug asap", "to": "professional" }
   to: professional | casual | friendly | formal | persuasive
   ────────────────────────────────────────────────────────────────── */
router.post('/tone', async (req, res) => {
  const key = getKey(res); if (!key) return;
  const { text, to = 'professional' } = req.body;
  if (!text) return fail(res, 'text is required');
  if (text.length > 2000) return fail(res, 'text too long (max 2000 chars)');

  const validTones = ['professional', 'casual', 'friendly', 'formal', 'persuasive'];
  if (!validTones.includes(to)) return fail(res, `to must be one of: ${validTones.join(', ')}`);

  try {
    const rewritten = await groq(key,
      `You are a writing assistant. Rewrite the provided text in a ${to} tone.
Keep the same meaning and intent. Return only the rewritten text — no explanation, no preamble.`,
      text,
      600
    );
    res.json({ success: true, original: text, rewritten, tone: to });
  } catch (e) {
    if (e.response?.status === 429) return fail(res, 'Groq rate limit hit — try again in a moment.', 429);
    fail(res, 'AI request failed: ' + (e.response?.data?.error?.message || e.message), 500);
  }
});

module.exports = router;
