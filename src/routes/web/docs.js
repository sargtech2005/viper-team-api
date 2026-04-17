const express = require('express');
const router  = express.Router();
const { optionalAuth } = require('../../middleware/auth');

// API endpoint catalog — only real, callable endpoints
const API_CATALOG = [
  {
    category: 'Utility',
    icon: '🔧',
    endpoints: [
      { method:'POST', path:'/api/v1/utility/qr',            label:'QR Code Generator',     desc:'Generate a QR code image from any text or URL.',        params:[{name:'text',required:true,desc:'Text or URL to encode'}] },
      { method:'POST', path:'/api/v1/utility/base64/encode',  label:'Base64 Encode',         desc:'Encode a string to Base64.',                            params:[{name:'text',required:true,desc:'String to encode'}] },
      { method:'POST', path:'/api/v1/utility/base64/decode',  label:'Base64 Decode',         desc:'Decode a Base64 string.',                               params:[{name:'text',required:true,desc:'Base64 string to decode'}] },
      { method:'GET',  path:'/api/v1/utility/uuid',           label:'UUID Generator',        desc:'Generate a cryptographically secure UUID v4.',          params:[] },
      { method:'POST', path:'/api/v1/utility/password',       label:'Password Generator',    desc:'Generate a strong random password.',                    params:[{name:'length',required:false,desc:'Password length (default: 16)'},{name:'symbols',required:false,desc:'Include symbols true/false'}] },
      { method:'POST', path:'/api/v1/utility/slugify',        label:'Text Slugifier',        desc:'Convert any text to a URL-friendly slug.',              params:[{name:'text',required:true,desc:'Text to slugify'}] },
      { method:'POST', path:'/api/v1/utility/text/analyze',   label:'Text Analyzer',         desc:'Count words, chars, sentences and reading time.',       params:[{name:'text',required:true,desc:'Text to analyze'}] },
      { method:'GET',  path:'/api/v1/utility/ip',             label:'IP Lookup',             desc:'Get info about the caller\'s IP or a specified IP.',    params:[{name:'ip',required:false,desc:'IP address (optional, uses your IP if empty)'}] },
    ],
  },
  {
    category: 'Fun & Random',
    icon: '🎭',
    endpoints: [
      { method:'GET', path:'/api/v1/fun/joke',   label:'Random Joke',   desc:'Returns a random joke (safe for all audiences).',     params:[{name:'category',required:false,desc:'Category: Any, Programming, Misc, Pun (default: Any)'}] },
      { method:'GET', path:'/api/v1/fun/quote',  label:'Random Quote',  desc:'Returns an inspiring random quote with author.',       params:[{name:'tag',required:false,desc:'Tag filter e.g. wisdom, love, life'}] },
      { method:'GET', path:'/api/v1/fun/fact',   label:'Random Fact',   desc:'Returns a random interesting fact.',                  params:[] },
    ],
  },
  {
    category: 'Search & Info',
    icon: '🔍',
    endpoints: [
      { method:'GET', path:'/api/v1/search/wikipedia', label:'Wikipedia Search', desc:'Get a Wikipedia article summary by search term.',      params:[{name:'q',required:true,desc:'Search term'}] },
      { method:'GET', path:'/api/v1/info/country',     label:'Country Info',     desc:'Get detailed info about any country.',                  params:[{name:'name',required:true,desc:'Country name e.g. Nigeria'}] },
      { method:'GET', path:'/api/v1/info/currency',    label:'Currency Rates',   desc:'Get live exchange rates from a base currency.',         params:[{name:'base',required:false,desc:'Base currency code e.g. USD, NGN (default: USD)'}] },
    ],
  },
  {
    category: 'Media & Image',
    icon: '🖼️',
    endpoints: [
      { method:'GET', path:'/api/v1/media/placeholder', label:'Placeholder Image', desc:'Generate a placeholder image of any size and color.', params:[{name:'width',required:false,desc:'Width in px (default: 400)'},{name:'height',required:false,desc:'Height in px (default: 300)'},{name:'text',required:false,desc:'Label text on image'},{name:'bg',required:false,desc:'Background hex color (no #)'}] },
      { method:'GET', path:'/api/v1/media/avatar',      label:'Avatar Generator',  desc:'Generate a letter-based avatar image for a username.', params:[{name:'name',required:true,desc:'Name or username'},{name:'size',required:false,desc:'Size in px (default: 150)'}] },
    ],
  },
];

router.get('/', optionalAuth, (req, res) => {
  res.render('docs/index', {
    title: 'API Docs & Playground — Viper-Team API',
    catalog: API_CATALOG,
    selectedCat: req.query.cat || null,
    layout: 'layouts/main',
  });
});

module.exports = router;
