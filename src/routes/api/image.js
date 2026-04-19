/**
 * /api/v1/image — Image Generation & Processing
 * Endpoints: /generate  /screenshot  /barcode  /og  /resize
 *
 * AI Image Gen  → Pollinations.ai (FREE, no API key needed)
 * Screenshots   → Microlink API   (free tier: 100 req/day)
 * Barcode       → bwip-js         (local, no external API)
 * Resize        → images.weserv.nl (free CDN proxy)
 *
 * npm install bwip-js
 */

const express = require('express');
const router  = express.Router();
const bwipjs  = require('bwip-js');
const axios   = require('axios');

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/image/generate
   ?prompt=a glowing city at night&width=512&height=512&model=flux
   
   Powered by Pollinations.ai — completely free, no API key.
   Models: flux (default, best quality), flux-realism, flux-anime,
           flux-3d, turbo (fastest)
   ────────────────────────────────────────────────────────────────── */
router.get('/generate', (req, res) => {
  const {
    prompt,
    width  = 512,
    height = 512,
    model  = 'flux',
    seed,
    enhance = 'true',
  } = req.query;

  if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });

  const validModels = ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'flux-pro', 'turbo'];
  if (!validModels.includes(model)) {
    return res.status(400).json({ success: false, error: `model must be one of: ${validModels.join(', ')}` });
  }

  const w = Math.min(parseInt(width)  || 512, 1920);
  const h = Math.min(parseInt(height) || 512, 1920);

  const params = new URLSearchParams({
    width:   w,
    height:  h,
    model,
    enhance,
    nologo:  'true',
  });
  if (seed) params.set('seed', seed);

  const encodedPrompt = encodeURIComponent(prompt.trim());
  const imageUrl      = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

  res.json({
    success:  true,
    prompt,
    model,
    width:    w,
    height:   h,
    seed:     seed || 'random',
    url:      imageUrl,
    provider: 'Pollinations.ai',
    note:     'Direct URL — load in <img> tag or download. Image generates on first load.',
  });
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/image/screenshot
   ?url=https://example.com&width=1280&height=800&type=jpeg
   
   Powered by Microlink API — free tier: 100 requests/day
   ────────────────────────────────────────────────────────────────── */
router.get('/screenshot', async (req, res) => {
  const { url, width = 1280, height = 800, type = 'jpeg' } = req.query;
  if (!url) return res.status(400).json({ success: false, error: 'url is required' });

  try {
    const apiUrl = 'https://api.microlink.io';
    const params = {
      url,
      screenshot:           true,
      'screenshot.type':    type,
      'screenshot.width':   parseInt(width),
      'screenshot.height':  parseInt(height),
      meta:                 false,
    };

    const { data } = await axios.get(apiUrl, { params, timeout: 20000 });

    if (data.status === 'success') {
      res.json({
        success:        true,
        url,
        screenshot_url: data.data?.screenshot?.url,
        width:          parseInt(width),
        height:         parseInt(height),
        type,
        provider:       'Microlink',
      });
    } else {
      res.status(500).json({ success: false, error: 'Screenshot failed', detail: data });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.response?.data?.message || e.message });
  }
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/image/barcode
   ?text=123456789012&type=ean13&scale=3&height=15
   
   Returns the barcode image directly (PNG).
   Common types: code128, ean13, ean8, qrcode, upca, upce,
                 code39, datamatrix, pdf417, azteccode
   ────────────────────────────────────────────────────────────────── */
router.get('/barcode', async (req, res) => {
  const { text, type = 'code128', scale = 3, height = 12 } = req.query;
  if (!text) return res.status(400).json({ success: false, error: 'text is required' });

  try {
    const png = await bwipjs.toBuffer({
      bcid:         type,
      text:         text.trim(),
      scale:        parseInt(scale),
      height:       parseInt(height),
      includetext:  true,
      textxalign:   'center',
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(png);
  } catch (e) {
    res.status(400).json({ success: false, error: `Barcode error: ${e.message}. Check type and text format.` });
  }
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/image/og
   ?title=My+Cool+App&desc=The+best+thing+ever&theme=dark

   Generates an Open Graph / social preview image URL.
   Uses Pollinations.ai — returns ready-to-use 1200×630 URL.
   ────────────────────────────────────────────────────────────────── */
router.get('/og', (req, res) => {
  const {
    title   = 'Viper API',
    desc    = 'Premium REST API for bots and apps',
    theme   = 'dark',
    logo,
  } = req.query;

  const bgColor = theme === 'light' ? 'white' : '#0d1117';
  const txtColor = theme === 'light' ? 'dark navy' : 'white';

  let prompt = `Professional Open Graph social media banner, ${bgColor} background, large bold ${txtColor} heading text saying "${title}", smaller subtitle saying "${desc}", modern minimalist tech design, gradient accent, clean layout, 1200x630`;
  if (logo) prompt += `, with logo icon`;

  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=630&model=flux&nologo=true`;

  res.json({
    success:   true,
    title,
    desc,
    theme,
    og_url:    url,
    width:     1200,
    height:    630,
    usage:     'Place og_url in <meta property="og:image" content="..."> tag',
  });
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/image/resize
   Body: { "url": "https://example.com/photo.jpg", "width": 300, "height": 200, "fit": "cover" }
   
   Powered by images.weserv.nl — free, unlimited CDN proxy.
   fit options: cover, contain, fill, inside, outside
   ────────────────────────────────────────────────────────────────── */
router.post('/resize', (req, res) => {
  const { url, width, height, fit = 'cover', output = 'jpg', quality = 80 } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'url is required' });
  if (!width && !height) return res.status(400).json({ success: false, error: 'at least width or height is required' });

  const validFit = ['cover', 'contain', 'fill', 'inside', 'outside'];
  if (!validFit.includes(fit)) {
    return res.status(400).json({ success: false, error: `fit must be one of: ${validFit.join(', ')}` });
  }

  const params = new URLSearchParams({ url, fit, output, q: quality });
  if (width)  params.set('w', width);
  if (height) params.set('h', height);

  const resizedUrl = `https://images.weserv.nl/?${params.toString()}`;

  res.json({
    success:     true,
    original:    url,
    resized_url: resizedUrl,
    width:       width  || 'auto',
    height:      height || 'auto',
    fit,
    output,
    provider:    'images.weserv.nl',
    note:        'resized_url is a direct image CDN link — use directly in <img> tags.',
  });
});

// ─── OCR — Image to Text ──────────────────────────────────────────────────────
// POST /api/v1/image/ocr
// Body: { "url": "https://..." }  OR  { "base64": "iVBORw0..." }
// Uses OCR.space free API — 25,000 req/month.
// Optional: add OCR_API_KEY to .env (free key at https://ocr.space/ocrapi)
// Falls back to the public demo key for low-volume use.
router.post('/ocr', async (req, res) => {
  const axios = require('axios');
  const { url, base64, language = 'eng', scale = true } = req.body;
  if (!url && !base64) return res.status(400).json({ success: false, error: 'url or base64 is required' });

  const apiKey = process.env.OCR_API_KEY || 'helloworld';

  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('apikey',            apiKey);
    form.append('language',          language);
    form.append('isOverlayRequired', 'false');
    form.append('scale',             scale ? 'true' : 'false');
    form.append('OCREngine',         '2');

    if (url) {
      form.append('url', url);
    } else {
      const dataUri = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      form.append('base64Image', dataUri);
    }

    const { data } = await axios.post('https://api.ocr.space/parse/image', form, {
      headers: form.getHeaders ? form.getHeaders() : { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });

    if (data.IsErroredOnProcessing) {
      return res.status(400).json({ success: false, error: data.ErrorMessage?.[0] || 'OCR processing failed' });
    }

    const results  = (data.ParsedResults || []).map(r => ({ text: r.ParsedText?.trim() || '', confidence: r.TextOverlay?.MeanConfidence || null }));
    const fullText = results.map(r => r.text).join('\n').trim();

    res.json({
      success:  true,
      text:     fullText,
      pages:    results.length,
      results,
      language,
      chars:    fullText.length,
      words:    fullText.split(/\s+/).filter(Boolean).length,
      processing_time_ms: data.ProcessingTimeInMilliseconds || null,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'OCR failed: ' + e.message });
  }
});

module.exports = router;
