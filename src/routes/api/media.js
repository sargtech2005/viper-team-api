const express = require('express');
const router  = express.Router();

// ─── Placeholder Image ────────────────────────────────────────────────────────
router.get('/placeholder', (req, res) => {
  const w    = Math.min(Math.max(parseInt(req.query.width)  || 400, 10), 2000);
  const h    = Math.min(Math.max(parseInt(req.query.height) || 300, 10), 2000);
  const bg   = (req.query.bg   || '1e1e2e').replace('#','');
  const text = req.query.text  || `${w}x${h}`;
  const fg   = req.query.fg    || 'aaaaaa';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#${bg}"/>
  <text x="${w/2}" y="${h/2}" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial,sans-serif" font-size="${Math.max(12, Math.min(w,h) * 0.12)}"
    fill="#${fg}">${text}</text>
</svg>`;

  res.set('Content-Type','image/svg+xml');
  res.set('Cache-Control','public, max-age=86400');
  res.send(svg);
});

// ─── Avatar Generator ─────────────────────────────────────────────────────────
router.get('/avatar', (req, res) => {
  const name = req.query.name || 'U';
  const size = Math.min(Math.max(parseInt(req.query.size) || 150, 32), 512);

  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0,2).join('');
  const colors   = ['7c3aed','10b981','3b82f6','ef4444','f59e0b','ec4899','06b6d4','84cc16'];
  const color    = colors[name.charCodeAt(0) % colors.length];
  const fs       = Math.round(size * 0.38);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#${color}"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size*0.2}" fill="url(#g)"/>
  <text x="${size/2}" y="${size/2}" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial,sans-serif" font-size="${fs}" font-weight="bold" fill="#ffffff">${initials}</text>
</svg>`;

  res.set('Content-Type','image/svg+xml');
  res.set('Cache-Control','public, max-age=86400');
  res.send(svg);
});

module.exports = router;
