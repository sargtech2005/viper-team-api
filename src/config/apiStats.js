/**
 * apiStats.js — Auto-counts live routes per API category.
 * Uses Node's require cache (populated at startup) so there's zero
 * DB overhead. Any new route module added to CATEGORIES will
 * automatically appear on the homepage after a server restart.
 */

const path = require('path');

// ── Category definitions ────────────────────────────────────────────────────
// Add a new entry here whenever a new API route module is created.
// 'modules' maps to filenames in src/routes/api/.
const CATEGORIES = [
  {
    key:     'utility',
    name:    'Utilities',
    icon:    'tool',
    color:   'ci-purple',
    docs:    '#utility',
    modules: ['utility'],
  },
  {
    key:     'fun',
    name:    'Fun & Games',
    icon:    'smile',
    color:   'ci-orange',
    docs:    '#fun',
    modules: ['fun'],
  },
  {
    key:     'search',
    name:    'Search & Info',
    icon:    'search',
    color:   'ci-blue',
    docs:    '#search',
    modules: ['search', 'info'],
  },
  {
    key:     'media',
    name:    'Media & Images',
    icon:    'image',
    color:   'ci-pink',
    docs:    '#media',
    modules: ['media'],
  },
  {
    key:     'text',
    name:    'Text Processing',
    icon:    'type',
    color:   'ci-green',
    docs:    '#text',
    modules: ['text'],
  },
  {
    key:     'number',
    name:    'Numbers & Math',
    icon:    'hash',
    color:   'ci-teal',
    docs:    '#number',
    modules: ['number'],
  },
  {
    key:     'validate',
    name:    'Validation',
    icon:    'check-circle',
    color:   'ci-yellow',
    docs:    '#validate',
    modules: ['validate'],
  },
  {
    key:     'generate',
    name:    'Generate',
    icon:    'cpu',
    color:   'ci-indigo',
    docs:    '#generate',
    modules: ['generate'],
  },
  {
    key:     'datetime',
    name:    'Date & Time',
    icon:    'clock',
    color:   'ci-rose',
    docs:    '#datetime',
    modules: ['datetime'],
  },
  {
    key:     'finance',
    name:    'Finance',
    icon:    'dollar-sign',
    color:   'ci-emerald',
    docs:    '#finance',
    modules: ['finance'],
  },
  {
    key:     'network',
    name:    'Network & Web',
    icon:    'globe',
    color:   'ci-blue',
    docs:    '#network',
    modules: ['network'],
  },
  {
    key:     'host',
    name:    'Host & IP',
    icon:    'server',
    color:   'ci-teal',
    docs:    '#host',
    modules: ['host'],
  },
  {
    key:     'detect',
    name:    'Detect & Analyse',
    icon:    'activity',
    color:   'ci-purple',
    docs:    '#detect',
    modules: ['detect'],
  },
  {
    key:     'image',
    name:    'Image Tools',
    icon:    'image',
    color:   'ci-pink',
    docs:    '#image',
    modules: ['image'],
  },
  {
    key:     'data',
    name:    'Data Conversion',
    icon:    'database',
    color:   'ci-indigo',
    docs:    '#data',
    modules: ['data'],
  },
  {
    key:     'weather',
    name:    'Weather',
    icon:    'cloud',
    color:   'ci-sky',
    docs:    '#weather',
    modules: ['weather'],
  },
  {
    key:     'notify',
    name:    'Notify',
    icon:    'bell',
    color:   'ci-orange',
    docs:    '#notify',
    modules: ['notify'],
  },
  {
    key:     'spotify',
    name:    'Spotify',
    icon:    'music',
    color:   'ci-green',
    docs:    '#spotify',
    modules: ['spotify'],
  },
  {
    key:     'download',
    name:    'Downloads',
    icon:    'download',
    color:   'ci-rose',
    docs:    '#download',
    modules: ['download'],
  },
  {
    key:     'meta',
    name:    'Meta',
    icon:    'radio',
    color:   'ci-yellow',
    docs:    '#meta',
    modules: ['meta'],
  },
  {
    key:     'crypto',
    name:    'Crypto & Blockchain',
    icon:    'trending-up',
    color:   'ci-yellow',
    docs:    '#crypto',
    modules: ['crypto'],
  },
  {
    key:     'url',
    name:    'URL Tools',
    icon:    'link',
    color:   'ci-blue',
    docs:    '#url',
    modules: ['url'],
  },
  {
    key:     'news',
    name:    'News',
    icon:    'newspaper',
    color:   'ci-orange',
    docs:    '#news',
    modules: ['news'],
  },
  {
    key:     'tempemail',
    name:    'Temp Email',
    icon:    'mail',
    color:   'ci-teal',
    docs:    '#tempemail',
    modules: ['tempemail'],
  },
  {
    key:     'color',
    name:    'Colour Tools',
    icon:    'droplet',
    color:   'ci-pink',
    docs:    '#color',
    modules: ['color'],
  },
  {
    key:     'code',
    name:    'Code Utilities',
    icon:    'code',
    color:   'ci-indigo',
    docs:    '#code',
    modules: ['code'],
  },
  {
    key:     'ai',
    name:    'AI Text',
    icon:    'zap',
    color:   'ci-purple',
    docs:    '#ai',
    modules: ['ai'],
  },
  {
    key:     'pdf',
    name:    'PDF Tools',
    icon:    'file-text',
    color:   'ci-rose',
    docs:    '#pdf',
    modules: ['pdf'],
  },
  {
    key:     'security',
    name:    'Security',
    icon:    'shield',
    color:   'ci-green',
    docs:    '#security',
    modules: ['security'],
  },
];

// ── Route counter ────────────────────────────────────────────────────────────
function countRouterEndpoints(router) {
  if (!router || !router.stack) return 0;
  let count = 0;
  for (const layer of router.stack) {
    if (layer.route) {
      // Each registered route counts as one endpoint
      count += 1;
    } else if (layer.handle && layer.handle.stack) {
      // Nested sub-router
      count += countRouterEndpoints(layer.handle);
    }
  }
  return count;
}

// ── Compute stats (cached after first call) ──────────────────────────────────
let _cache = null;

function getStats() {
  if (_cache) return _cache;

  const categories = [];
  let totalEndpoints = 0;

  for (const cat of CATEGORIES) {
    let count = 0;
    for (const mod of cat.modules) {
      try {
        const router = require(`../routes/api/${mod}`);
        count += countRouterEndpoints(router);
      } catch (_) {
        // Module doesn't exist yet — skip silently
      }
    }
    if (count > 0) {
      categories.push({ ...cat, count });
      totalEndpoints += count;
    }
  }

  _cache = {
    categories,
    totalEndpoints,
    totalCategories: categories.length,
  };

  return _cache;
}

// Allow hot-clearing the cache (useful if routes are reloaded)
function bustCache() { _cache = null; }

module.exports = { getStats, bustCache, CATEGORIES };
