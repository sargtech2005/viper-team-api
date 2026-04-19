/**
 * /api/v1/color — Colour Utilities
 *
 * GET  /api/v1/color/convert?value=%23ff5733&from=hex
 * GET  /api/v1/color/name?hex=ff5733
 * GET  /api/v1/color/contrast?fg=ffffff&bg=000000
 * GET  /api/v1/color/random?format=hex
 * POST /api/v1/color/mix   { colors: ["#ff0000","#0000ff"], weights: [0.5,0.5] }
 *
 * All local — no external API calls needed.
 */

const express = require('express');
const router  = express.Router();
const fail    = (res, msg, code = 400) => res.status(code).json({ success: false, error: msg });

/* ── Conversion helpers ── */
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) throw new Error('Invalid hex color');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb({ h, s, l }) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

function rgbToCmyk({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: Math.round((1 - r - k) / (1 - k) * 100), m: Math.round((1 - g - k) / (1 - k) * 100), y: Math.round((1 - b - k) / (1 - k) * 100), k: Math.round(k * 100) };
}

function luminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseColor(value, from) {
  value = value.trim();
  if (from === 'hex' || (!from && value.startsWith('#'))) {
    return hexToRgb(value);
  }
  if (from === 'rgb' || value.startsWith('rgb')) {
    const m = value.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) throw new Error('Invalid RGB format. Use: r,g,b or rgb(r,g,b)');
    return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  }
  if (from === 'hsl' || value.startsWith('hsl')) {
    const m = value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
    if (!m) throw new Error('Invalid HSL format. Use: h,s,l or hsl(h,s%,l%)');
    return hslToRgb({ h: parseInt(m[1]), s: parseInt(m[2]), l: parseInt(m[3]) });
  }
  // Try hex without #
  if (/^[0-9a-fA-F]{3,6}$/.test(value)) return hexToRgb(value);
  throw new Error(`Unsupported color format. Use hex (#ff0000), rgb (255,0,0) or hsl (0,100,50). Set from=hex|rgb|hsl.`);
}

// 150 named CSS colors
const COLOR_NAMES = {
  'ff0000':'Red','00ff00':'Lime','0000ff':'Blue','ffff00':'Yellow','ff00ff':'Magenta','00ffff':'Cyan',
  'ffffff':'White','000000':'Black','808080':'Gray','c0c0c0':'Silver','800000':'Maroon','808000':'Olive',
  '008000':'Green','800080':'Purple','008080':'Teal','000080':'Navy','ffa500':'Orange','ff4500':'OrangeRed',
  'ff6347':'Tomato','ff7f50':'Coral','ffd700':'Gold','daa520':'Goldenrod','b8860b':'DarkGoldenrod',
  'adff2f':'GreenYellow','7fff00':'Chartreuse','00ff7f':'SpringGreen','00fa9a':'MediumSpringGreen',
  '40e0d0':'Turquoise','48d1cc':'MediumTurquoise','20b2aa':'LightSeaGreen','5f9ea0':'CadetBlue',
  '4682b4':'SteelBlue','6495ed':'CornflowerBlue','87ceeb':'SkyBlue','87cefa':'LightSkyBlue',
  '1e90ff':'DodgerBlue','4169e1':'RoyalBlue','0000cd':'MediumBlue','00008b':'DarkBlue',
  '191970':'MidnightBlue','7b68ee':'MediumSlateBlue','6a5acd':'SlateBlue','483d8b':'DarkSlateBlue',
  '8a2be2':'BlueViolet','9400d3':'DarkViolet','9932cc':'DarkOrchid','ba55d3':'MediumOrchid',
  'da70d6':'Orchid','ee82ee':'Violet','dda0dd':'Plum','d8bfd8':'Thistle','ff1493':'DeepPink',
  'ff69b4':'HotPink','ffb6c1':'LightPink','ffc0cb':'Pink','db7093':'PaleVioletRed','c71585':'MediumVioletRed',
  '8b0000':'DarkRed','e9967a':'DarkSalmon','fa8072':'Salmon','ffa07a':'LightSalmon','dc143c':'Crimson',
  'cd5c5c':'IndianRed','bc8f8f':'RosyBrown','a0522d':'Sienna','8b4513':'SaddleBrown','d2691e':'Chocolate',
  'f4a460':'SandyBrown','deb887':'BurlyWood','d2b48c':'Tan','navajowhite':'NavajoWhite','f5deb3':'Wheat',
  'ffe4b5':'Moccasin','ffdead':'NavajoWhite','faebd7':'AntiqueWhite','ffebcd':'BlanchedAlmond',
  'ffe4c4':'Bisque','fff8dc':'Cornsilk','fffacd':'LemonChiffon','fffff0':'Ivory','f0fff0':'HoneyDew',
  'f0ffff':'Azure','f0f8ff':'AliceBlue','f5f5f5':'WhiteSmoke','fffafa':'Snow','f8f8ff':'GhostWhite',
  '696969':'DimGray','a9a9a9':'DarkGray','d3d3d3':'LightGray','dcdcdc':'Gainsboro','778899':'LightSlateGray',
  '708090':'SlateGray','2f4f4f':'DarkSlateGray','006400':'DarkGreen','228b22':'ForestGreen',
  '2e8b57':'SeaGreen','3cb371':'MediumSeaGreen','66cdaa':'MediumAquamarine','90ee90':'LightGreen',
  '98fb98':'PaleGreen','8fbc8f':'DarkSeaGreen','556b2f':'DarkOliveGreen','6b8e23':'OliveDrab',
  '9acd32':'YellowGreen','32cd32':'LimeGreen',
};

function nearestColorName(hex) {
  hex = hex.replace('#', '').toLowerCase();
  if (COLOR_NAMES[hex]) return COLOR_NAMES[hex];
  // Find nearest by euclidean distance in RGB space
  try {
    const { r: tr, g: tg, b: tb } = hexToRgb(hex);
    let nearest = null, minDist = Infinity;
    for (const [h, name] of Object.entries(COLOR_NAMES)) {
      try {
        const { r, g, b } = hexToRgb(h);
        const dist = Math.sqrt((r-tr)**2 + (g-tg)**2 + (b-tb)**2);
        if (dist < minDist) { minDist = dist; nearest = name; }
      } catch (_) {}
    }
    return nearest;
  } catch { return null; }
}

/* ── GET /convert?value=%23ff5733&from=hex ── */
router.get('/convert', (req, res) => {
  const { value, from } = req.query;
  if (!value) return fail(res, 'value is required');
  try {
    const rgb  = parseColor(decodeURIComponent(value), from);
    const hex  = rgbToHex(rgb);
    const hsl  = rgbToHsl(rgb);
    const cmyk = rgbToCmyk(rgb);
    res.json({
      success: true,
      input:   { value, from: from || 'auto-detected' },
      hex:     hex,
      rgb:     `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      rgb_values: rgb,
      hsl:     `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsl_values: hsl,
      cmyk:    `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
      cmyk_values: cmyk,
      name:    nearestColorName(hex) || null,
    });
  } catch (e) {
    fail(res, e.message);
  }
});

/* ── GET /name?hex=ff5733 ── */
router.get('/name', (req, res) => {
  const { hex } = req.query;
  if (!hex) return fail(res, 'hex is required');
  try {
    const clean = hex.replace('#', '').toLowerCase();
    const rgb   = hexToRgb(clean);
    const name  = nearestColorName(clean);
    res.json({ success: true, hex: '#' + clean, name, rgb_values: rgb });
  } catch (e) {
    fail(res, e.message);
  }
});

/* ── GET /contrast?fg=ffffff&bg=000000 ── */
router.get('/contrast', (req, res) => {
  const { fg, bg } = req.query;
  if (!fg || !bg) return fail(res, 'fg (foreground) and bg (background) are both required');
  try {
    const fgRgb = hexToRgb(fg.replace('#', ''));
    const bgRgb = hexToRgb(bg.replace('#', ''));
    const l1 = luminance(fgRgb), l2 = luminance(bgRgb);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const rounded = Math.round(ratio * 100) / 100;
    res.json({
      success: true,
      fg: '#' + fg.replace('#',''), bg: '#' + bg.replace('#',''),
      contrast_ratio: rounded,
      ratio_display: `${rounded}:1`,
      wcag: {
        aa_normal:  ratio >= 4.5  ? 'PASS' : 'FAIL',
        aa_large:   ratio >= 3    ? 'PASS' : 'FAIL',
        aaa_normal: ratio >= 7    ? 'PASS' : 'FAIL',
        aaa_large:  ratio >= 4.5  ? 'PASS' : 'FAIL',
      },
      readable: ratio >= 4.5,
    });
  } catch (e) {
    fail(res, e.message);
  }
});

/* ── GET /random?format=hex ── */
router.get('/random', (req, res) => {
  const { format = 'hex', count = 1 } = req.query;
  const n = Math.min(parseInt(count)||1, 20);
  const colors = Array.from({ length: n }, () => {
    const r = Math.floor(Math.random()*256), g = Math.floor(Math.random()*256), b = Math.floor(Math.random()*256);
    const hex  = rgbToHex({r,g,b});
    const hsl  = rgbToHsl({r,g,b});
    return { hex, rgb: `rgb(${r},${g},${b})`, hsl: `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`, name: nearestColorName(hex.slice(1)) };
  });
  res.json({ success: true, count: n, colors: n === 1 ? undefined : colors, color: n === 1 ? colors[0] : undefined, ...(n > 1 ? {} : colors[0]) });
});

/* ── POST /mix { colors: ["#ff0000","#0000ff"], weights: [0.5,0.5] } ── */
router.post('/mix', (req, res) => {
  const { colors, weights } = req.body || {};
  if (!colors || !Array.isArray(colors) || colors.length < 2) return fail(res, 'colors must be an array of at least 2 hex colors');
  const w = weights && weights.length === colors.length ? weights.map(Number) : colors.map(() => 1 / colors.length);
  const total = w.reduce((a, b) => a + b, 0);
  try {
    const rgbs = colors.map(c => hexToRgb(c.replace('#','')));
    const mixed = {
      r: Math.round(rgbs.reduce((sum, c, i) => sum + c.r * w[i], 0) / total),
      g: Math.round(rgbs.reduce((sum, c, i) => sum + c.g * w[i], 0) / total),
      b: Math.round(rgbs.reduce((sum, c, i) => sum + c.b * w[i], 0) / total),
    };
    const hex = rgbToHex(mixed);
    const hsl = rgbToHsl(mixed);
    res.json({ success: true, inputs: colors, weights: w, hex, rgb: `rgb(${mixed.r},${mixed.g},${mixed.b})`, hsl: `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`, name: nearestColorName(hex.slice(1)) });
  } catch (e) {
    fail(res, e.message);
  }
});

module.exports = router;
