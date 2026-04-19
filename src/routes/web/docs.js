const express = require('express');
const router  = express.Router();
const { optionalAuth } = require('../../middleware/auth');

const API_CATALOG = [
  {
    category: 'Utility',
    icon: '🔧',
    endpoints: [
      { method:'POST', path:'/api/v1/utility/qr',            label:'QR Code Generator',    desc:'Generate a QR code image (returns base64) from any text or URL.',                       params:[{name:'text',required:true,desc:'Text or URL to encode'}] },
      { method:'POST', path:'/api/v1/utility/base64/encode',  label:'Base64 Encode',        desc:'Encode a string to Base64.',                                                             params:[{name:'text',required:true,desc:'String to encode'}] },
      { method:'POST', path:'/api/v1/utility/base64/decode',  label:'Base64 Decode',        desc:'Decode a Base64 string back to UTF-8.',                                                  params:[{name:'text',required:true,desc:'Base64 string to decode'}] },
      { method:'GET',  path:'/api/v1/utility/uuid',           label:'UUID Generator',       desc:'Generate 1-10 cryptographically secure UUID v4 values.',                                params:[{name:'count',required:false,desc:'Number of UUIDs (default: 1, max: 10)'}] },
      { method:'POST', path:'/api/v1/utility/password',       label:'Password Generator',   desc:'Generate a strong random password with strength score.',                                 params:[{name:'length',required:false,desc:'Length (default: 16, max: 128)'},{name:'symbols',required:false,desc:'Include symbols true/false (default: true)'}] },
      { method:'POST', path:'/api/v1/utility/slugify',        label:'Text Slugifier',       desc:'Convert text to a URL-friendly slug.',                                                   params:[{name:'text',required:true,desc:'Text to slugify'}] },
      { method:'POST', path:'/api/v1/utility/text/analyze',   label:'Text Analyzer',        desc:'Count words, chars, sentences, paragraphs and reading time.',                           params:[{name:'text',required:true,desc:'Text to analyze'}] },
      { method:'GET',  path:'/api/v1/utility/ip',             label:'IP Lookup',            desc:'Geo-locate any IP address (country, city, ISP, timezone).',                             params:[{name:'ip',required:false,desc:'IP address (optional — uses caller IP if omitted)'}] },
    ],
  },
  {
    category: 'Text & String',
    icon: '📝',
    endpoints: [
      { method:'POST', path:'/api/v1/text/case',             label:'Case Converter',        desc:'Convert text between upper, lower, title, camel, snake, kebab, pascal, constant, sentence, alternating.', params:[{name:'text',required:true,desc:'Input text'},{name:'to',required:true,desc:'upper|lower|title|sentence|camel|pascal|snake|kebab|constant|alternating'}] },
      { method:'POST', path:'/api/v1/text/truncate',         label:'Truncate Text',         desc:'Trim text to a max length with custom ellipsis.',                                        params:[{name:'text',required:true,desc:'Input text'},{name:'length',required:false,desc:'Max characters (default: 100)'},{name:'ellipsis',required:false,desc:'Suffix string (default: ...)'}] },
      { method:'POST', path:'/api/v1/text/reverse',          label:'Reverse Text',          desc:'Reverse chars, words, or lines.',                                                        params:[{name:'text',required:true,desc:'Input text'},{name:'mode',required:false,desc:'chars | words | lines (default: chars)'}] },
      { method:'GET',  path:'/api/v1/text/lorem',            label:'Lorem Ipsum',           desc:'Generate placeholder lorem ipsum text.',                                                 params:[{name:'count',required:false,desc:'Number of items (default: 1)'},{name:'type',required:false,desc:'paragraphs | sentences | words (default: paragraphs)'}] },
      { method:'POST', path:'/api/v1/text/palindrome',       label:'Palindrome Check',      desc:'Check if text is a palindrome.',                                                         params:[{name:'text',required:true,desc:'Text to check'}] },
      { method:'POST', path:'/api/v1/text/count',            label:'Count Occurrences',     desc:'Count how many times a substring appears.',                                              params:[{name:'text',required:true,desc:'Source text'},{name:'find',required:true,desc:'Substring to find'},{name:'case_sensitive',required:false,desc:'true/false (default: false)'}] },
      { method:'POST', path:'/api/v1/text/dedupe',           label:'Remove Duplicates',     desc:'Remove duplicate lines from text.',                                                      params:[{name:'text',required:true,desc:'Multi-line text'},{name:'case_sensitive',required:false,desc:'true/false (default: true)'}] },
      { method:'POST', path:'/api/v1/text/extract/emails',   label:'Extract Emails',        desc:'Extract all email addresses from a block of text.',                                      params:[{name:'text',required:true,desc:'Text to scan'}] },
      { method:'POST', path:'/api/v1/text/extract/urls',     label:'Extract URLs',          desc:'Extract all URLs from a block of text.',                                                 params:[{name:'text',required:true,desc:'Text to scan'}] },
      { method:'POST', path:'/api/v1/text/extract/numbers',  label:'Extract Numbers',       desc:'Extract all numbers with stats (sum, avg, min, max).',                                   params:[{name:'text',required:true,desc:'Text to scan'}] },
      { method:'POST', path:'/api/v1/text/hash',             label:'Hash Generator',        desc:'Hash text with md5, sha1, sha256, or sha512.',                                           params:[{name:'text',required:true,desc:'Text to hash'},{name:'algorithm',required:false,desc:'md5|sha1|sha256|sha512 (default: sha256)'}] },
      { method:'POST', path:'/api/v1/text/diff',             label:'Line Diff',             desc:'Compare two texts and get added/removed/unchanged lines.',                               params:[{name:'text1',required:true,desc:'Original text'},{name:'text2',required:true,desc:'New text'}] },
      { method:'POST', path:'/api/v1/text/translate',        label:'Translate Text',        desc:'Translate text between 100+ languages. Free, no key needed. Powered by MyMemory.',      params:[{name:'text',required:true,desc:'Text to translate (max 500 chars)'},{name:'to',required:true,desc:'Target language code e.g. es, fr, yo, ha, ig, ar'},{name:'from',required:false,desc:'Source language code (default: auto)'}] },
    ],
  },
  {
    category: 'Numbers & Math',
    icon: '🔢',
    endpoints: [
      { method:'GET',  path:'/api/v1/number/random',    label:'Random Number',       desc:'Generate 1-100 random integers within a range.',                              params:[{name:'min',required:false,desc:'Min value (default: 1)'},{name:'max',required:false,desc:'Max value (default: 100)'},{name:'count',required:false,desc:'How many (default: 1, max: 100)'}] },
      { method:'GET',  path:'/api/v1/number/words',     label:'Number to Words',     desc:'Convert any integer up to billions to written English words.',                 params:[{name:'n',required:true,desc:'Integer number'}] },
      { method:'GET',  path:'/api/v1/number/roman',     label:'Roman Numerals',      desc:'Convert integer (1-3999) to Roman numerals.',                                  params:[{name:'n',required:true,desc:'Integer between 1 and 3999'}] },
      { method:'GET',  path:'/api/v1/number/fibonacci', label:'Fibonacci Sequence',  desc:'Get the first N numbers of the Fibonacci sequence.',                           params:[{name:'n',required:false,desc:'How many terms (default: 10, max: 100)'}] },
      { method:'GET',  path:'/api/v1/number/prime',     label:'Prime Check',         desc:'Check if a number is prime.',                                                  params:[{name:'n',required:true,desc:'Integer to check'}] },
      { method:'POST', path:'/api/v1/number/stats',     label:'Statistics',          desc:'Get mean, median, mode, std dev, variance for a set of numbers.',              params:[{name:'numbers',required:true,desc:'JSON array of numbers e.g. [1,2,3,4,5]'}] },
      { method:'GET',  path:'/api/v1/number/convert',   label:'Unit Converter',      desc:'Convert between length, weight, speed, data, time, area units.',               params:[{name:'value',required:true,desc:'Numeric value'},{name:'from',required:true,desc:'Unit e.g. km, lb, mb'},{name:'to',required:true,desc:'Target unit'}] },
      { method:'GET',  path:'/api/v1/number/bmi',       label:'BMI Calculator',      desc:'Calculate Body Mass Index and category.',                                      params:[{name:'weight',required:true,desc:'Weight in kg'},{name:'height',required:true,desc:'Height in cm'}] },
    ],
  },
  {
    category: 'Validation',
    icon: '✅',
    endpoints: [
      { method:'POST', path:'/api/v1/validate/email',             label:'Email Validator',          desc:'Validate email format and detect disposable addresses.',                      params:[{name:'email',required:true,desc:'Email address to validate'}] },
      { method:'POST', path:'/api/v1/validate/url',               label:'URL Validator',             desc:'Validate URL structure and parse its components.',                            params:[{name:'url',required:true,desc:'URL to validate'}] },
      { method:'POST', path:'/api/v1/validate/phone',             label:'Phone Validator',           desc:'Validate phone number format, detect Nigerian numbers.',                      params:[{name:'phone',required:true,desc:'Phone number (any format)'}] },
      { method:'POST', path:'/api/v1/validate/credit-card',       label:'Credit Card (Luhn)',         desc:'Validate credit card number using Luhn algorithm, detect card type.',         params:[{name:'number',required:true,desc:'Card number (spaces/dashes stripped)'}] },
      { method:'POST', path:'/api/v1/validate/password-strength', label:'Password Strength',         desc:'Score a password and get improvement suggestions.',                           params:[{name:'password',required:true,desc:'Password to analyse'}] },
      { method:'POST', path:'/api/v1/validate/color',             label:'Color Validator',           desc:'Validate hex or RGB color, convert to hex/RGB/HSL.',                         params:[{name:'color',required:true,desc:'Color string e.g. #ff0000 or rgb(255,0,0)'}] },
      { method:'POST', path:'/api/v1/validate/nin',               label:'NIN Format Check',          desc:'Validate Nigerian NIN format (11-digit numeric).',                            params:[{name:'nin',required:true,desc:'National Identification Number'}] },
      { method:'POST', path:'/api/v1/validate/bvn',               label:'BVN Format Check',          desc:'Validate Nigerian BVN format (11-digit numeric).',                            params:[{name:'bvn',required:true,desc:'Bank Verification Number'}] },
      { method:'POST', path:'/api/v1/validate/disposable',        label:'Disposable Email Check',    desc:'Check if an email domain is a known disposable/throwaway provider. No key needed.', params:[{name:'email',required:true,desc:'Email address to check'}] },
      { method:'POST', path:'/api/v1/validate/phone-lookup',      label:'Phone Lookup (Detailed)',   desc:'Detect carrier, line type and country from a phone number. Nigerian networks fully supported (MTN/Airtel/Glo/9mobile). Uses libphonenumber-js locally — no API key.', params:[{name:'phone',required:true,desc:'Phone number in any format'},{name:'country',required:false,desc:'Default country hint e.g. NG, US, GB (default: NG)'}] },
    ],
  },
  {
    category: 'Generate',
    icon: '⚡',
    endpoints: [
      { method:'GET',  path:'/api/v1/generate/color',   label:'Random Color Palette', desc:'Generate a random colour palette with hex, rgb, hsl values.',                 params:[{name:'count',required:false,desc:'Number of colors (default: 5, max: 20)'}] },
      { method:'GET',  path:'/api/v1/generate/name',    label:'Random Name',          desc:'Generate random full names (first + last).',                                  params:[{name:'count',required:false,desc:'Number of names (default: 1, max: 50)'},{name:'gender',required:false,desc:'male | female | any (default: any)'}] },
      { method:'POST', path:'/api/v1/generate/barcode', label:'Barcode Generator',    desc:'Generate a barcode SVG for EAN-13, Code128, or UPC-A formats.',               params:[{name:'value',required:true,desc:'Value to encode'},{name:'format',required:false,desc:'ean13|code128|upca (default: code128)'}] },
      { method:'POST', path:'/api/v1/generate/users',   label:'Fake User Data',       desc:'Generate realistic fake user profiles for testing.',                          params:[{name:'count',required:false,desc:'Number of users (default: 5, max: 50)'}] },
      { method:'GET',  path:'/api/v1/generate/avatar',  label:'Initials Avatar (SVG)',desc:'Generate a crisp SVG avatar from initials. Returns image/svg+xml — use directly as an <img> src URL. No external API, pure local.',  params:[{name:'name',required:false,desc:'Full name e.g. "John Doe" (default: Viper API)'},{name:'size',required:false,desc:'Width/height in px (default: 80, max: 400)'},{name:'bg',required:false,desc:'Background hex color without # (default: 7c3aed)'},{name:'color',required:false,desc:'Text hex color without # (default: ffffff)'},{name:'rounded',required:false,desc:'true = circle, false = rounded square (default: true)'}] },
      { method:'POST', path:'/api/v1/generate/invoice', label:'Invoice PDF Generator',desc:'Generate a professional invoice PDF from structured JSON. Returns base64-encoded PDF. Requires pdfkit: npm install pdfkit.',  params:[{name:'invoice_number',required:false,desc:'Invoice number (default: INV-001)'},{name:'date',required:false,desc:'Issue date YYYY-MM-DD (default: today)'},{name:'due_date',required:false,desc:'Due date YYYY-MM-DD'},{name:'from',required:false,desc:'Object: { name, email, address }'},{name:'to',required:false,desc:'Object: { name, email, address }'},{name:'items',required:true,desc:'Array of { description, qty, price }'},{name:'currency',required:false,desc:'Currency code (default: USD)'},{name:'tax_percent',required:false,desc:'Tax % to add (default: 0)'},{name:'notes',required:false,desc:'Optional footer note'}] },
    ],
  },
  {
    category: 'Date & Time',
    icon: '📅',
    endpoints: [
      { method:'GET', path:'/api/v1/datetime/now',         label:'Current Time',          desc:'Get the current UTC time in multiple formats (ISO, unix, readable).',     params:[{name:'tz',required:false,desc:'IANA timezone e.g. Africa/Lagos (default: UTC)'}] },
      { method:'GET', path:'/api/v1/datetime/convert',     label:'Convert Timezone',      desc:'Convert a datetime from one timezone to another.',                         params:[{name:'datetime',required:true,desc:'ISO datetime string'},{name:'from',required:true,desc:'Source IANA timezone'},{name:'to',required:true,desc:'Target IANA timezone'}] },
      { method:'GET', path:'/api/v1/datetime/diff',        label:'Date Difference',       desc:'Get the difference between two dates in multiple units.',                  params:[{name:'from',required:true,desc:'Start date YYYY-MM-DD'},{name:'to',required:false,desc:'End date YYYY-MM-DD (default: today)'}] },
      { method:'GET', path:'/api/v1/datetime/add',         label:'Add / Subtract',        desc:'Add or subtract days/months/years from a date.',                           params:[{name:'date',required:true,desc:'Base date YYYY-MM-DD'},{name:'amount',required:true,desc:'Amount (negative to subtract)'},{name:'unit',required:true,desc:'days|weeks|months|years'}] },
      { method:'GET', path:'/api/v1/datetime/format',      label:'Format Date',           desc:'Format a date in any strftime-style pattern or named format.',             params:[{name:'date',required:true,desc:'Date string'},{name:'format',required:false,desc:'Output format string (default: ISO)'},{name:'timezone',required:false,desc:'IANA timezone'}] },
      { method:'GET', path:'/api/v1/datetime/businessday', label:'Business Day Check',    desc:'Check if a date is a business day (Mon-Fri).',                             params:[{name:'date',required:false,desc:'Date YYYY-MM-DD (default: today)'}] },
      { method:'GET', path:'/api/v1/datetime/timezone',    label:'Timezone Lookup',       desc:'Get full timezone info — local time, UTC offset, DST status — for any IANA timezone or city name. Powered by WorldTimeAPI (free, no key).', params:[{name:'tz',required:false,desc:'IANA timezone e.g. Africa/Lagos, America/New_York'},{name:'city',required:false,desc:'City name e.g. Lagos, London, Tokyo (alternative to tz)'}] },
    ],
  },
  {
    category: 'Finance',
    icon: '💰',
    endpoints: [
      { method:'GET', path:'/api/v1/finance/rates',   label:'Exchange Rates',        desc:'Live FX rates for 150+ currencies. Needs EXCHANGERATE_API_KEY.',               params:[{name:'base',required:false,desc:'Base currency (default: USD)'}] },
      { method:'GET', path:'/api/v1/finance/convert', label:'Currency Converter',    desc:'Convert an amount between any two currencies.',                                 params:[{name:'from',required:true,desc:'Source currency e.g. USD'},{name:'to',required:true,desc:'Target currency e.g. NGN'},{name:'amount',required:false,desc:'Amount (default: 1)'}] },
      { method:'GET', path:'/api/v1/finance/symbols', label:'Currency Symbols',      desc:'List all supported currency codes, names and symbols.',                         params:[] },
    ],
  },
  {
    category: 'Network & Web',
    icon: '🌐',
    endpoints: [
      { method:'GET', path:'/api/v1/network/dns',        label:'DNS Lookup',          desc:'Resolve DNS records (A, AAAA, MX, TXT, NS, CNAME) for a domain.',              params:[{name:'domain',required:true,desc:'Domain name'},{name:'type',required:false,desc:'Record type: A|AAAA|MX|TXT|NS|CNAME (default: A)'}] },
      { method:'GET', path:'/api/v1/network/ssl',        label:'SSL Certificate',     desc:'Inspect a domain SSL/TLS certificate — expiry, issuer, SANs.',                  params:[{name:'domain',required:true,desc:'Domain name (no https://)'}] },
      { method:'GET', path:'/api/v1/network/headers',    label:'HTTP Headers',        desc:'Fetch the response headers returned by any URL.',                               params:[{name:'url',required:true,desc:'Full URL'}] },
      { method:'GET', path:'/api/v1/network/ping',       label:'Ping Host',           desc:'Check if a host is reachable and measure response time.',                       params:[{name:'host',required:true,desc:'Hostname or IP address'}] },
      { method:'GET', path:'/api/v1/network/domain-age', label:'Domain Age',          desc:'Look up when a domain was first registered and calculate its age. Parses WHOIS data — no API key needed.', params:[{name:'domain',required:true,desc:'Domain name e.g. google.com'}] },
    ],
  },
  {
    category: 'Host & IP',
    icon: '🖥️',
    endpoints: [
      { method:'GET', path:'/api/v1/host/ip',         label:'IP Geo-Info',           desc:'Get country, region, city, ISP, ASN and coordinates for any IP.',               params:[{name:'ip',required:false,desc:'IPv4/IPv6 address (defaults to caller IP)'}] },
      { method:'GET', path:'/api/v1/host/lookup',     label:'Reverse DNS Lookup',    desc:'Resolve an IP to its hostname (PTR record).',                                    params:[{name:'ip',required:true,desc:'IPv4 or IPv6 address'}] },
      { method:'GET', path:'/api/v1/host/whois',      label:'WHOIS Lookup',          desc:'Fetch raw WHOIS data for a domain or IP.',                                       params:[{name:'query',required:true,desc:'Domain name or IP address'}] },
      { method:'GET', path:'/api/v1/host/ports',      label:'Port Scanner',          desc:'Scan common ports on a host and report open/closed status.',                     params:[{name:'host',required:true,desc:'Hostname or IP'}] },
      { method:'GET', path:'/api/v1/host/tech',       label:'Tech Detection',        desc:'Detect CMS, frameworks, CDN and server software from a site headers.',           params:[{name:'url',required:true,desc:'Full URL including https://'}] },
      { method:'GET', path:'/api/v1/host/reputation', label:'IP Reputation',         desc:'Check if an IP is a known proxy, VPN, datacenter or mobile network. Returns a risk score and flags. Powered by ip-api.com (free, no key).', params:[{name:'ip',required:false,desc:'IPv4 address to check (defaults to caller IP)'}] },
    ],
  },
  {
    category: 'Detect & Analyse',
    icon: '🔍',
    endpoints: [
      { method:'POST', path:'/api/v1/detect/language',    label:'Language Detection', desc:'Detect the written language of any text.',                                      params:[{name:'text',required:true,desc:'Text to analyse (min 10 chars for accuracy)'}] },
      { method:'POST', path:'/api/v1/detect/sentiment',   label:'Sentiment Analysis', desc:'Analyse the emotional tone of text (positive/negative/neutral + score).',      params:[{name:'text',required:true,desc:'Text to analyse'}] },
      { method:'POST', path:'/api/v1/detect/spam',        label:'Spam Detection',     desc:'Heuristic spam score — checks for caps abuse, link density, spam phrases.',    params:[{name:'text',required:true,desc:'Text or email body to scan'}] },
      { method:'POST', path:'/api/v1/detect/readability', label:'Readability Score',  desc:'Flesch-Kincaid readability grade and reading ease score.',                      params:[{name:'text',required:true,desc:'Text to analyse (min 100 chars)'}] },
    ],
  },
  {
    category: 'Image Tools',
    icon: '🖼️',
    endpoints: [
      { method:'GET',  path:'/api/v1/image/generate',   label:'AI Image Generator',  desc:'Generate an AI image from a text prompt via Pollinations.ai (free, no key). Returns a direct image URL.', params:[{name:'prompt',required:true,desc:'Image description'},{name:'width',required:false,desc:'Width in px (default: 1024)'},{name:'height',required:false,desc:'Height in px (default: 1024)'},{name:'model',required:false,desc:'Model name (default: flux)'}] },
      { method:'GET',  path:'/api/v1/image/screenshot', label:'Website Screenshot',  desc:'Capture a screenshot of any URL via Microlink (free tier).',                    params:[{name:'url',required:true,desc:'URL to screenshot'},{name:'fullpage',required:false,desc:'true for full-page capture'},{name:'mobile',required:false,desc:'true for mobile viewport'}] },
      { method:'POST', path:'/api/v1/image/resize',     label:'Resize & Convert',    desc:'Resize an image by URL and convert format via images.weserv.nl (free CDN).',   params:[{name:'url',required:true,desc:'Public image URL'},{name:'width',required:false,desc:'Target width px'},{name:'height',required:false,desc:'Target height px'},{name:'fit',required:false,desc:'cover|contain|fill|inside|outside (default: cover)'},{name:'output',required:false,desc:'jpg|png|webp|gif (default: jpg)'}] },
      { method:'POST', path:'/api/v1/image/ocr',        label:'OCR — Image to Text', desc:'Extract text from any image (URL or base64). Powered by OCR.space free API (25,000 req/month). Add OCR_API_KEY to .env for higher limits.', params:[{name:'url',required:false,desc:'Public image URL'},{name:'base64',required:false,desc:'Base64-encoded image (raw or data URI)'},{name:'language',required:false,desc:'Language code e.g. eng, fra, deu (default: eng)'},{name:'scale',required:false,desc:'Upscale small images before OCR (default: true)'}] },
    ],
  },
  {
    category: 'Data Conversion',
    icon: '🔄',
    endpoints: [
      { method:'POST', path:'/api/v1/data/json-to-csv',  label:'JSON to CSV',        desc:'Convert a JSON array to CSV format.',                                          params:[{name:'data',required:true,desc:'JSON array of objects'}] },
      { method:'POST', path:'/api/v1/data/csv-to-json',  label:'CSV to JSON',        desc:'Parse CSV text into a JSON array.',                                            params:[{name:'csv',required:true,desc:'CSV string (first row = headers)'},{name:'delimiter',required:false,desc:'Column delimiter (default: ,)'}] },
      { method:'POST', path:'/api/v1/data/json-to-xml',  label:'JSON to XML',        desc:'Convert a JSON object to an XML string.',                                      params:[{name:'data',required:true,desc:'JSON object'},{name:'root',required:false,desc:'Root element name (default: root)'}] },
      { method:'POST', path:'/api/v1/data/xml-to-json',  label:'XML to JSON',        desc:'Parse an XML string into a JSON object.',                                      params:[{name:'xml',required:true,desc:'XML string'}] },
      { method:'POST', path:'/api/v1/data/json-to-yaml', label:'JSON to YAML',       desc:'Convert JSON to YAML format.',                                                 params:[{name:'data',required:true,desc:'JSON object or array'}] },
      { method:'POST', path:'/api/v1/data/yaml-to-json', label:'YAML to JSON',       desc:'Parse YAML into a JSON object.',                                               params:[{name:'yaml',required:true,desc:'YAML string'}] },
    ],
  },
  {
    category: 'Weather',
    icon: '🌤️',
    endpoints: [
      { method:'GET', path:'/api/v1/weather/current',  label:'Current Weather',      desc:'Live weather for any city or coordinates. Needs OPENWEATHER_API_KEY.',           params:[{name:'city',required:false,desc:'City name e.g. Lagos'},{name:'lat',required:false,desc:'Latitude'},{name:'lon',required:false,desc:'Longitude'},{name:'units',required:false,desc:'metric|imperial (default: metric)'}] },
      { method:'GET', path:'/api/v1/weather/forecast', label:'5-Day Forecast',       desc:'3-hour interval forecast for 5 days. Needs OPENWEATHER_API_KEY.',               params:[{name:'city',required:false,desc:'City name'},{name:'lat',required:false,desc:'Latitude'},{name:'lon',required:false,desc:'Longitude'},{name:'units',required:false,desc:'metric|imperial (default: metric)'}] },
    ],
  },
  {
    category: 'Notify',
    icon: '🔔',
    endpoints: [
      { method:'POST', path:'/api/v1/notify/email',   label:'Send Email',             desc:'Send a transactional email via your configured SMTP server.',                   params:[{name:'to',required:true,desc:'Recipient email address'},{name:'subject',required:true,desc:'Email subject'},{name:'body',required:true,desc:'Plain text or HTML body'},{name:'from',required:false,desc:'Sender name (default: Viper API)'}] },
      { method:'POST', path:'/api/v1/notify/webhook', label:'Trigger Webhook',        desc:'POST a JSON payload to any external URL.',                                      params:[{name:'url',required:true,desc:'Webhook endpoint URL'},{name:'payload',required:true,desc:'JSON object to send'},{name:'headers',required:false,desc:'Optional custom request headers'}] },
    ],
  },
  {
    category: 'Spotify',
    icon: '🎵',
    endpoints: [
      { method:'GET', path:'/api/v1/spotify/search', label:'Search Tracks',          desc:'Search Spotify for tracks, albums or artists. Needs SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET.', params:[{name:'q',required:true,desc:'Search query'},{name:'type',required:false,desc:'track|album|artist (default: track)'},{name:'limit',required:false,desc:'Results (default: 10, max: 50)'}] },
      { method:'GET', path:'/api/v1/spotify/track',  label:'Track Details',          desc:'Get full details for a Spotify track by ID.',                                   params:[{name:'id',required:true,desc:'Spotify track ID'}] },
      { method:'GET', path:'/api/v1/spotify/album',  label:'Album Details',          desc:'Get full details for a Spotify album by ID.',                                   params:[{name:'id',required:true,desc:'Spotify album ID'}] },
      { method:'GET', path:'/api/v1/spotify/artist', label:'Artist Details',         desc:'Get full details for a Spotify artist by ID.',                                  params:[{name:'id',required:true,desc:'Spotify artist ID'}] },
    ],
  },
  {
    category: 'Downloads',
    icon: '⬇️',
    endpoints: [
      { method:'POST', path:'/api/v1/download/info',      label:'Media Info',         desc:'Get metadata (title, formats, duration) for a video URL without downloading.', params:[{name:'url',required:true,desc:'Video URL (YouTube, TikTok, Instagram, 50+ platforms)'}] },
      { method:'POST', path:'/api/v1/download/video',     label:'Download Video',     desc:'Download a video and return a direct link.',                                   params:[{name:'url',required:true,desc:'Video URL'},{name:'quality',required:false,desc:'best|worst|720p|480p|360p (default: best)'}] },
      { method:'POST', path:'/api/v1/download/audio',     label:'Download Audio',     desc:'Extract audio (MP3) from any video URL.',                                      params:[{name:'url',required:true,desc:'Video URL'}] },
      { method:'POST', path:'/api/v1/download/thumbnail', label:'Download Thumbnail', desc:'Extract the thumbnail/cover image from a video URL.',                          params:[{name:'url',required:true,desc:'Video URL'}] },
      { method:'POST', path:'/api/v1/download/playlist',  label:'Playlist Info',      desc:'Get the track listing and metadata for a playlist.',                           params:[{name:'url',required:true,desc:'Playlist URL'}] },
    ],
  },
  {
    category: 'Meta',
    icon: '📡',
    endpoints: [
      { method:'GET', path:'/api/v1/meta/og',      label:'Open Graph Scraper',       desc:'Extract Open Graph / Twitter card metadata from any URL.',                     params:[{name:'url',required:true,desc:'URL to scrape'}] },
      { method:'GET', path:'/api/v1/meta/sitemap', label:'Sitemap Parser',            desc:'Fetch and parse a sitemap.xml, returning all URLs.',                           params:[{name:'url',required:true,desc:'Domain or full sitemap URL'}] },
      { method:'GET', path:'/api/v1/meta/status',  label:'API Status',               desc:'Returns live API status, version, total endpoints and categories.',            params:[] },
    ],
  },
  {
    category: 'Crypto & Blockchain',
    icon: '₿',
    endpoints: [
      { method:'GET', path:'/api/v1/crypto/price',   label:'Coin Price',             desc:'Live price for any cryptocurrency in USD or other fiat.',                       params:[{name:'coin',required:true,desc:'Coin ID e.g. bitcoin, ethereum, solana'},{name:'currency',required:false,desc:'Fiat currency (default: usd)'}] },
      { method:'GET', path:'/api/v1/crypto/top',     label:'Top Coins',              desc:'Top N cryptocurrencies by market cap.',                                         params:[{name:'limit',required:false,desc:'Number of coins (default: 10, max: 100)'},{name:'currency',required:false,desc:'vs currency (default: usd)'}] },
      { method:'GET', path:'/api/v1/crypto/history', label:'Price History',          desc:'Historical daily closing prices for a coin.',                                   params:[{name:'coin',required:true,desc:'Coin ID e.g. bitcoin'},{name:'days',required:false,desc:'Days of history (default: 7, max: 365)'}] },
      { method:'GET', path:'/api/v1/crypto/convert', label:'Crypto Converter',       desc:'Convert between crypto and fiat amounts at live rates.',                        params:[{name:'from',required:true,desc:'Coin ID or fiat code'},{name:'to',required:true,desc:'Target coin ID or fiat code'},{name:'amount',required:false,desc:'Amount to convert (default: 1)'}] },
    ],
  },
  {
    category: 'URL Tools',
    icon: '🔗',
    endpoints: [
      { method:'POST', path:'/api/v1/url/shorten', label:'Shorten URL',             desc:'Shorten any URL using TinyURL (free, no key needed).',                          params:[{name:'url',required:true,desc:'Full URL to shorten'}] },
      { method:'GET',  path:'/api/v1/url/expand',  label:'Expand URL',              desc:'Expand a shortened URL to its final destination.',                              params:[{name:'url',required:true,desc:'Short URL to expand'}] },
      { method:'POST', path:'/api/v1/url/parse',   label:'Parse URL',               desc:'Break a URL into all its components — protocol, host, path, params, hash.',    params:[{name:'url',required:true,desc:'URL to parse'}] },
      { method:'GET',  path:'/api/v1/url/safe',    label:'Safety Check',            desc:'Heuristic safety check — detects phishing patterns, suspicious domains.',      params:[{name:'url',required:true,desc:'URL to check'}] },
    ],
  },
  {
    category: 'News',
    icon: '📰',
    endpoints: [
      { method:'GET', path:'/api/v1/news/top',     label:'Top Headlines',           desc:'Latest top headlines by category and country. Needs GNEWS_API_KEY.',            params:[{name:'category',required:false,desc:'general|world|nation|business|technology|entertainment|sports|science|health (default: general)'},{name:'country',required:false,desc:'Country code e.g. ng, us, gb (default: ng)'},{name:'lang',required:false,desc:'Language code e.g. en (default: en)'},{name:'limit',required:false,desc:'Results (default: 10, max: 10 on free tier)'}] },
      { method:'GET', path:'/api/v1/news/search',  label:'Search News',             desc:'Search news articles by keyword. Needs GNEWS_API_KEY.',                        params:[{name:'q',required:true,desc:'Search query'},{name:'lang',required:false,desc:'Language code (default: en)'},{name:'limit',required:false,desc:'Results (default: 10)'}] },
      { method:'GET', path:'/api/v1/news/sources', label:'Sources Info',            desc:'List all supported categories, countries and languages.',                       params:[] },
    ],
  },
  {
    category: 'Temp Email',
    icon: '📬',
    endpoints: [
      { method:'GET', path:'/api/v1/tempemail/generate', label:'Generate Email',    desc:'Get a fresh temporary email address. No sign-up needed.',                       params:[{name:'domain',required:false,desc:'Preferred domain e.g. 1secmail.com'}] },
      { method:'GET', path:'/api/v1/tempemail/inbox',    label:'Read Inbox',        desc:'Check inbox for a temp email address.',                                         params:[{name:'email',required:true,desc:'The temp email address'}] },
      { method:'GET', path:'/api/v1/tempemail/message',  label:'Read Message',      desc:'Read the full content of one email message.',                                   params:[{name:'email',required:true,desc:'The temp email address'},{name:'id',required:true,desc:'Message ID from inbox'}] },
      { method:'GET', path:'/api/v1/tempemail/domains',  label:'List Domains',      desc:'List all available @domains for temp email generation.',                        params:[] },
    ],
  },
  {
    category: 'Colour Tools',
    icon: '🎨',
    endpoints: [
      { method:'GET',  path:'/api/v1/color/convert', label:'Convert Color',        desc:'Convert any color between HEX, RGB, HSL and CMYK formats.',                     params:[{name:'value',required:true,desc:'Color value e.g. %23ff5733 (URL-encode the #)'},{name:'from',required:false,desc:'hex|rgb|hsl (auto-detected if omitted)'}] },
      { method:'GET',  path:'/api/v1/color/name',    label:'Color Name',           desc:'Get the nearest CSS color name for any hex code.',                               params:[{name:'hex',required:true,desc:'Hex color e.g. ff5733 (without #)'}] },
      { method:'GET',  path:'/api/v1/color/contrast', label:'Contrast Ratio',      desc:'WCAG contrast ratio between foreground and background colors.',                  params:[{name:'fg',required:true,desc:'Foreground hex (without #)'},{name:'bg',required:true,desc:'Background hex (without #)'}] },
      { method:'GET',  path:'/api/v1/color/random',  label:'Random Color',         desc:'Generate random color(s) with all format values.',                               params:[{name:'count',required:false,desc:'How many colors (default: 1, max: 20)'}] },
      { method:'POST', path:'/api/v1/color/mix',     label:'Mix Colors',           desc:'Mix two or more hex colors with optional weights.',                              params:[{name:'colors',required:true,desc:'JSON array of hex colors e.g. ["#ff0000","#0000ff"]'},{name:'weights',required:false,desc:'JSON array of mix weights e.g. [0.7,0.3]'}] },
    ],
  },
  {
    category: 'Code Utilities',
    icon: '💻',
    endpoints: [
      { method:'POST', path:'/api/v1/code/minify',   label:'Minify Code',          desc:'Minify JSON, HTML, CSS or JavaScript. Returns size saved.',                      params:[{name:'code',required:true,desc:'Source code string'},{name:'type',required:false,desc:'json|html|css|js (default: json)'}] },
      { method:'POST', path:'/api/v1/code/format',   label:'Format/Beautify',      desc:'Prettify JSON or HTML with configurable indentation.',                           params:[{name:'code',required:true,desc:'Source code string'},{name:'type',required:false,desc:'json|html (default: json)'},{name:'indent',required:false,desc:'Spaces per indent (default: 2)'}] },
      { method:'POST', path:'/api/v1/code/count',    label:'Count Lines',          desc:'Count total, code, comment and blank lines. Detects language.',                  params:[{name:'code',required:true,desc:'Source code string'}] },
      { method:'POST', path:'/api/v1/code/escape',   label:'Escape',               desc:'Escape code for HTML, URL, Base64 or Unicode.',                                  params:[{name:'code',required:true,desc:'String to escape'},{name:'type',required:false,desc:'html|url|base64|unicode (default: html)'}] },
      { method:'POST', path:'/api/v1/code/unescape', label:'Unescape',             desc:'Reverse HTML entities, URL encoding, Base64 or Unicode escapes.',                params:[{name:'code',required:true,desc:'Escaped string'},{name:'type',required:false,desc:'html|url|base64|unicode (default: html)'}] },
    ],
  },
  {
    category: 'AI Text',
    icon: '🤖',
    endpoints: [
      { method:'POST', path:'/api/v1/ai/complete',  label:'Text Completion',        desc:'Complete or generate text from any prompt using LLaMA 3 via Groq (free, fast). Add GROQ_API_KEY to .env — free key at console.groq.com.',  params:[{name:'prompt',required:true,desc:'Your prompt (max 4000 chars)'},{name:'max_tokens',required:false,desc:'Max tokens to generate (default: 512, max: 1024)'}] },
      { method:'POST', path:'/api/v1/ai/summarize', label:'Summarize Text',         desc:'Summarise any long passage in short, medium or long form using AI. Requires GROQ_API_KEY.',  params:[{name:'text',required:true,desc:'Text to summarise (max 8000 chars)'},{name:'length',required:false,desc:'short | medium | long (default: medium)'}] },
      { method:'POST', path:'/api/v1/ai/grammar',   label:'Grammar Correction',     desc:'Fix grammar, spelling and punctuation errors. Returns corrected text + list of issues found. Requires GROQ_API_KEY.',  params:[{name:'text',required:true,desc:'Text to correct (max 3000 chars)'}] },
      { method:'POST', path:'/api/v1/ai/explain',   label:'Explain Anything',       desc:'Get a clear explanation of any concept, question or code snippet at simple or technical level. Requires GROQ_API_KEY.',  params:[{name:'text',required:true,desc:'Concept, question or code snippet (max 2000 chars)'},{name:'level',required:false,desc:'simple | technical (default: simple)'}] },
      { method:'POST', path:'/api/v1/ai/tone',      label:'Tone Rewriter',          desc:'Rewrite text in a different tone — professional, casual, friendly, formal or persuasive. Requires GROQ_API_KEY.',  params:[{name:'text',required:true,desc:'Text to rewrite (max 2000 chars)'},{name:'to',required:true,desc:'professional | casual | friendly | formal | persuasive'}] },
    ],
  },
  {
    category: 'PDF Tools',
    icon: '📄',
    endpoints: [
      { method:'POST', path:'/api/v1/pdf/generate', label:'Generate PDF',           desc:'Create a clean, styled PDF from structured JSON — title, sections, body text and tables. Returns base64-encoded PDF. Requires: npm install pdfkit.',  params:[{name:'title',required:true,desc:'Document title'},{name:'subtitle',required:false,desc:'Subtitle shown in header'},{name:'sections',required:false,desc:'Array of { heading, body, table: { headers[], rows[][] } }'},{name:'footer',required:false,desc:'Footer text'}] },
      { method:'POST', path:'/api/v1/pdf/extract',  label:'Extract PDF Text',       desc:'Extract all readable text from a PDF. Returns text, page count and word count. Requires: npm install pdf-parse.',  params:[{name:'pdf_base64',required:false,desc:'Base64-encoded PDF'},{name:'pdf_url',required:false,desc:'Public URL of a PDF file (alternative to base64)'}] },
      { method:'POST', path:'/api/v1/pdf/merge',    label:'Merge PDFs',             desc:'Merge 2–10 PDF files into one. Returns base64-encoded merged PDF. Requires: npm install pdf-lib.',  params:[{name:'pdfs',required:true,desc:'Array of 2–10 base64-encoded PDF strings'}] },
    ],
  },
  {
    category: 'Security',
    icon: '🛡️',
    endpoints: [
      { method:'GET',  path:'/api/v1/security/pwned',   label:'Password Breach Check',    desc:'Check if a password has appeared in known data breaches using HIBP k-anonymity. Only the first 5 chars of the SHA1 hash are sent — your password is never transmitted. Free, no key needed.',  params:[{name:'password',required:true,desc:'Password to check (k-anonymity — never sent in full)'}] },
      { method:'GET',  path:'/api/v1/security/headers', label:'Security Headers Audit',   desc:'Fetch a URL and audit its HTTP security headers — HSTS, CSP, X-Frame-Options, Referrer-Policy and more. Returns a letter grade and score.',  params:[{name:'url',required:true,desc:'Full URL to audit e.g. https://example.com'}] },
      { method:'POST', path:'/api/v1/security/csp',     label:'CSP Analyser',             desc:'Analyse a Content-Security-Policy header string and flag unsafe directives (unsafe-inline, unsafe-eval, wildcards). Returns a score and issue list.',  params:[{name:'policy',required:true,desc:"Full CSP header string e.g. \"default-src 'self'; script-src 'unsafe-inline'\""}] },
    ],
  },
];

router.get('/', optionalAuth, (req, res) => {
  res.render('docs/index', {
    title:       'API Docs & Playground — Viper-Team API',
    catalog:     API_CATALOG,
    selectedCat: req.query.cat || null,
    layout:      'layouts/main',
  });
});

module.exports = router;
