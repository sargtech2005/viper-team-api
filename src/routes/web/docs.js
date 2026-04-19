const express = require('express');
const router  = express.Router();
const { optionalAuth } = require('../../middleware/auth');

const API_CATALOG = [
  {
    category: 'Utility',
    icon: '🔧',
    endpoints: [
      { method:'POST', path:'/api/v1/utility/qr',           label:'QR Code Generator',  desc:'Generate a QR code image (returns base64) from any text or URL.',     params:[{name:'text',required:true,desc:'Text or URL to encode'}] },
      { method:'POST', path:'/api/v1/utility/base64/encode', label:'Base64 Encode',      desc:'Encode a string to Base64.',                                           params:[{name:'text',required:true,desc:'String to encode'}] },
      { method:'POST', path:'/api/v1/utility/base64/decode', label:'Base64 Decode',      desc:'Decode a Base64 string back to UTF-8.',                                params:[{name:'text',required:true,desc:'Base64 string to decode'}] },
      { method:'GET',  path:'/api/v1/utility/uuid',          label:'UUID Generator',     desc:'Generate 1-10 cryptographically secure UUID v4 values.',               params:[{name:'count',required:false,desc:'Number of UUIDs (default: 1, max: 10)'}] },
      { method:'POST', path:'/api/v1/utility/password',      label:'Password Generator', desc:'Generate a strong random password with strength score.',               params:[{name:'length',required:false,desc:'Length (default: 16, max: 128)'},{name:'symbols',required:false,desc:'Include symbols true/false (default: true)'}] },
      { method:'POST', path:'/api/v1/utility/slugify',       label:'Text Slugifier',     desc:'Convert text to a URL-friendly slug.',                                 params:[{name:'text',required:true,desc:'Text to slugify'}] },
      { method:'POST', path:'/api/v1/utility/text/analyze',  label:'Text Analyzer',      desc:'Count words, chars, sentences, paragraphs and reading time.',          params:[{name:'text',required:true,desc:'Text to analyze'}] },
      { method:'GET',  path:'/api/v1/utility/ip',            label:'IP Lookup',          desc:'Geo-locate any IP address (country, city, ISP, timezone).',            params:[{name:'ip',required:false,desc:'IP address (optional — uses caller IP if omitted)'}] },
    ],
  },
  {
    category: 'Text & String',
    icon: '📝',
    endpoints: [
      { method:'POST', path:'/api/v1/text/case',            label:'Case Converter',      desc:'Convert text between upper, lower, title, camel, snake, kebab, pascal, constant, sentence, alternating.',  params:[{name:'text',required:true,desc:'Input text'},{name:'to',required:true,desc:'Target case: upper|lower|title|sentence|camel|pascal|snake|kebab|constant|alternating'}] },
      { method:'POST', path:'/api/v1/text/truncate',        label:'Truncate Text',       desc:'Trim text to a max length with custom ellipsis.',                      params:[{name:'text',required:true,desc:'Input text'},{name:'length',required:false,desc:'Max characters (default: 100)'},{name:'ellipsis',required:false,desc:'Suffix string (default: ...)'}] },
      { method:'POST', path:'/api/v1/text/reverse',         label:'Reverse Text',        desc:'Reverse chars, words, or lines.',                                      params:[{name:'text',required:true,desc:'Input text'},{name:'mode',required:false,desc:'chars | words | lines (default: chars)'}] },
      { method:'GET',  path:'/api/v1/text/lorem',           label:'Lorem Ipsum',         desc:'Generate placeholder lorem ipsum text.',                               params:[{name:'count',required:false,desc:'Number of items (default: 1)'},{name:'type',required:false,desc:'paragraphs | sentences | words (default: paragraphs)'}] },
      { method:'POST', path:'/api/v1/text/palindrome',      label:'Palindrome Check',    desc:'Check if text is a palindrome.',                                       params:[{name:'text',required:true,desc:'Text to check'}] },
      { method:'POST', path:'/api/v1/text/count',           label:'Count Occurrences',   desc:'Count how many times a substring appears.',                            params:[{name:'text',required:true,desc:'Source text'},{name:'find',required:true,desc:'Substring to find'},{name:'case_sensitive',required:false,desc:'true/false (default: false)'}] },
      { method:'POST', path:'/api/v1/text/dedupe',          label:'Remove Duplicates',   desc:'Remove duplicate lines from text.',                                    params:[{name:'text',required:true,desc:'Multi-line text'},{name:'case_sensitive',required:false,desc:'true/false (default: true)'}] },
      { method:'POST', path:'/api/v1/text/extract/emails',  label:'Extract Emails',      desc:'Extract all email addresses from a block of text.',                    params:[{name:'text',required:true,desc:'Text to scan'}] },
      { method:'POST', path:'/api/v1/text/extract/urls',    label:'Extract URLs',        desc:'Extract all URLs from a block of text.',                               params:[{name:'text',required:true,desc:'Text to scan'}] },
      { method:'POST', path:'/api/v1/text/extract/numbers', label:'Extract Numbers',     desc:'Extract all numbers with stats (sum, avg, min, max).',                 params:[{name:'text',required:true,desc:'Text to scan'}] },
      { method:'POST', path:'/api/v1/text/hash',            label:'Hash Generator',      desc:'Hash text with md5, sha1, sha256, or sha512.',                         params:[{name:'text',required:true,desc:'Text to hash'},{name:'algorithm',required:false,desc:'md5|sha1|sha256|sha512 (default: sha256)'}] },
      { method:'POST', path:'/api/v1/text/diff',            label:'Line Diff',           desc:'Compare two texts and get added/removed/unchanged lines.',             params:[{name:'text1',required:true,desc:'Original text'},{name:'text2',required:true,desc:'New text'}] },
    ],
  },
  {
    category: 'Numbers & Math',
    icon: '🔢',
    endpoints: [
      { method:'GET',  path:'/api/v1/number/random',    label:'Random Number',      desc:'Generate 1-100 random integers within a range.',                      params:[{name:'min',required:false,desc:'Min value (default: 1)'},{name:'max',required:false,desc:'Max value (default: 100)'},{name:'count',required:false,desc:'How many (default: 1, max: 100)'}] },
      { method:'GET',  path:'/api/v1/number/words',     label:'Number to Words',    desc:'Convert any integer up to billions to written English words.',         params:[{name:'n',required:true,desc:'Integer number'}] },
      { method:'GET',  path:'/api/v1/number/roman',     label:'Roman Numerals',     desc:'Convert integer (1–3999) to Roman numerals.',                          params:[{name:'n',required:true,desc:'Integer between 1 and 3999'}] },
      { method:'GET',  path:'/api/v1/number/fibonacci', label:'Fibonacci Sequence', desc:'Get the first N numbers of the Fibonacci sequence.',                   params:[{name:'n',required:false,desc:'How many terms (default: 10, max: 100)'}] },
      { method:'GET',  path:'/api/v1/number/prime',     label:'Prime Check',        desc:'Check if a number is prime.',                                          params:[{name:'n',required:true,desc:'Integer to check'}] },
      { method:'POST', path:'/api/v1/number/stats',     label:'Statistics',         desc:'Get mean, median, mode, std dev, variance for a set of numbers.',      params:[{name:'numbers',required:true,desc:'JSON array of numbers e.g. [1,2,3,4,5]'}] },
      { method:'GET',  path:'/api/v1/number/convert',   label:'Unit Converter',     desc:'Convert between length, weight, speed, data, time, area units.',       params:[{name:'value',required:true,desc:'Numeric value'},{name:'from',required:true,desc:'Unit e.g. km, lb, mb'},{name:'to',required:true,desc:'Target unit'}] },
      { method:'GET',  path:'/api/v1/number/bmi',       label:'BMI Calculator',     desc:'Calculate Body Mass Index and category.',                              params:[{name:'weight',required:true,desc:'Weight in kg'},{name:'height',required:true,desc:'Height in cm'}] },
    ],
  },
  {
    category: 'Validation',
    icon: '✅',
    endpoints: [
      { method:'POST', path:'/api/v1/validate/email',           label:'Email Validator',         desc:'Validate email format and detect disposable addresses.',           params:[{name:'email',required:true,desc:'Email address to validate'}] },
      { method:'POST', path:'/api/v1/validate/url',             label:'URL Validator',            desc:'Validate URL structure and parse its components.',                 params:[{name:'url',required:true,desc:'URL to validate'}] },
      { method:'POST', path:'/api/v1/validate/phone',           label:'Phone Validator',          desc:'Validate phone number format, detect Nigerian numbers.',           params:[{name:'phone',required:true,desc:'Phone number (any format)'}] },
      { method:'POST', path:'/api/v1/validate/credit-card',     label:'Credit Card (Luhn)',        desc:'Validate credit card number using Luhn algorithm, detect card type.',params:[{name:'number',required:true,desc:'Card number (spaces/dashes stripped)'}] },
      { method:'POST', path:'/api/v1/validate/password-strength',label:'Password Strength',        desc:'Score a password and get improvement suggestions.',                params:[{name:'password',required:true,desc:'Password to analyse'}] },
      { method:'POST', path:'/api/v1/validate/color',           label:'Color Validator',          desc:'Validate hex or RGB color, convert to hex/RGB/HSL.',              params:[{name:'color',required:true,desc:'Color string e.g. #ff0000 or rgb(255,0,0)'}] },
      { method:'POST', path:'/api/v1/validate/json',            label:'JSON Validator',           desc:'Validate JSON string and return type and key count.',              params:[{name:'text',required:true,desc:'JSON string to validate'}] },
      { method:'POST', path:'/api/v1/validate/nin',             label:'NIN Format Check',         desc:'Validate Nigerian National Identification Number format.',         params:[{name:'nin',required:true,desc:'11-digit NIN'}] },
      { method:'POST', path:'/api/v1/validate/bvn',             label:'BVN Format Check',         desc:'Validate Nigerian Bank Verification Number format.',               params:[{name:'bvn',required:true,desc:'11-digit BVN'}] },
    ],
  },
  {
    category: 'Generate & Mock',
    icon: '🎲',
    endpoints: [
      { method:'GET', path:'/api/v1/generate/name',    label:'Random Name',           desc:'Generate realistic Nigerian or Western random names.',                 params:[{name:'count',required:false,desc:'How many (max: 20)'},{name:'gender',required:false,desc:'male|female|any'},{name:'origin',required:false,desc:'nigerian|western|any'}] },
      { method:'GET', path:'/api/v1/generate/address', label:'Random Address',        desc:'Generate fake Nigerian or US addresses for testing.',                  params:[{name:'count',required:false,desc:'How many (max: 10)'},{name:'country',required:false,desc:'nigeria|us (default: nigeria)'}] },
      { method:'GET', path:'/api/v1/generate/otp',     label:'OTP Generator',         desc:'Generate a numeric or alphanumeric one-time password.',                params:[{name:'length',required:false,desc:'Length (default: 6, range: 4–10)'},{name:'type',required:false,desc:'numeric|alphanumeric (default: numeric)'}] },
      { method:'GET', path:'/api/v1/generate/token',   label:'Token Generator',       desc:'Generate a secure random token for auth/session use.',                 params:[{name:'length',required:false,desc:'Length (default: 32, max: 128)'},{name:'type',required:false,desc:'hex|base64|alphanumeric (default: hex)'}] },
      { method:'GET', path:'/api/v1/generate/palette', label:'Color Palette',         desc:'Generate a harmonious colour palette.',                               params:[{name:'count',required:false,desc:'Colors (default: 5)'},{name:'scheme',required:false,desc:'random|monochrome|complementary'}] },
      { method:'GET', path:'/api/v1/generate/user',    label:'Mock User Profile',     desc:'Generate realistic fake user profiles for testing/seeding.',           params:[{name:'count',required:false,desc:'How many users (max: 10)'}] },
    ],
  },
  {
    category: 'Date & Time',
    icon: '🕐',
    endpoints: [
      { method:'GET', path:'/api/v1/datetime/now',         label:'Current Time',       desc:'Get current UTC time and local time in any timezone.',                 params:[{name:'timezone',required:false,desc:'IANA timezone e.g. Africa/Lagos (default: UTC)'}] },
      { method:'GET', path:'/api/v1/datetime/timestamp',   label:'Unix Timestamp',     desc:'Convert a Unix timestamp to readable date, or get current timestamp.', params:[{name:'ts',required:false,desc:'Unix timestamp in seconds or ms (omit for current)'}] },
      { method:'GET', path:'/api/v1/datetime/diff',        label:'Date Difference',    desc:'Get the exact difference between two dates in all units.',             params:[{name:'from',required:true,desc:'Start date (YYYY-MM-DD)'},{name:'to',required:true,desc:'End date (YYYY-MM-DD)'}] },
      { method:'GET', path:'/api/v1/datetime/add',         label:'Add/Subtract Date',  desc:'Add or subtract days, months, years from a date.',                    params:[{name:'date',required:false,desc:'Base date (default: today)'},{name:'days',required:false,desc:'Days to add (negative to subtract)'},{name:'months',required:false,desc:'Months'},{name:'years',required:false,desc:'Years'}] },
      { method:'GET', path:'/api/v1/datetime/format',      label:'Format Date',        desc:'Format any date as human, short, long, relative, time, ISO and more.', params:[{name:'date',required:false,desc:'Date string (default: now)'},{name:'format',required:false,desc:'human|short|long|iso|time|time12|date|relative'},{name:'timezone',required:false,desc:'IANA timezone'}] },
      { method:'GET', path:'/api/v1/datetime/businessday', label:'Business Day Check', desc:'Check if a date is a business day or weekend.',                        params:[{name:'date',required:false,desc:'Date (YYYY-MM-DD, default: today)'}] },
    ],
  },
  {
    category: 'Finance',
    icon: '💰',
    endpoints: [
      { method:'GET', path:'/api/v1/finance/convert',  label:'Currency Convert',   desc:'Convert any amount between currencies using live exchange rates.',      params:[{name:'amount',required:true,desc:'Amount to convert'},{name:'from',required:false,desc:'Source currency (default: USD)'},{name:'to',required:false,desc:'Target currency (default: NGN)'}] },
      { method:'GET', path:'/api/v1/finance/loan',     label:'Loan/EMI Calculator',desc:'Calculate monthly EMI, total payment, and total interest for a loan.',  params:[{name:'principal',required:true,desc:'Loan amount'},{name:'rate',required:true,desc:'Annual interest rate %'},{name:'months',required:true,desc:'Loan duration in months'}] },
      { method:'GET', path:'/api/v1/finance/compound', label:'Compound Interest',  desc:'Calculate compound interest growth over time.',                         params:[{name:'principal',required:true,desc:'Initial amount'},{name:'rate',required:true,desc:'Annual rate %'},{name:'years',required:true,desc:'Duration'},{name:'times',required:false,desc:'Compounds per year (default: 12)'}] },
      { method:'GET', path:'/api/v1/finance/vat',      label:'VAT Calculator',     desc:'Add or remove VAT from an amount (default 7.5% Nigeria rate).',         params:[{name:'amount',required:true,desc:'Base amount'},{name:'rate',required:false,desc:'VAT % (default: 7.5)'},{name:'mode',required:false,desc:'add|remove (default: add)'}] },
      { method:'GET', path:'/api/v1/finance/tip',      label:'Tip Calculator',     desc:'Calculate tip and split bill between people.',                          params:[{name:'bill',required:true,desc:'Bill total'},{name:'tip',required:false,desc:'Tip % (default: 10)'},{name:'people',required:false,desc:'Number of people (default: 1)'}] },
      { method:'GET', path:'/api/v1/finance/discount', label:'Discount Calculator',desc:'Calculate sale price after a % or flat discount.',                      params:[{name:'price',required:true,desc:'Original price'},{name:'discount',required:true,desc:'Discount value'},{name:'type',required:false,desc:'percent|flat (default: percent)'}] },
    ],
  },
  {
    category: 'Fun & Random',
    icon: '🎭',
    endpoints: [
      { method:'GET', path:'/api/v1/fun/joke',           label:'Random Joke',       desc:'Safe, clean random joke (Programming, Pun, Misc, or Any).',            params:[{name:'category',required:false,desc:'Any|Programming|Misc|Pun|Spooky (default: Any)'}] },
      { method:'GET', path:'/api/v1/fun/quote',          label:'Random Quote',      desc:'Random inspiring quote with author.',                                  params:[] },
      { method:'GET', path:'/api/v1/fun/fact',           label:'Random Fact',       desc:'Random interesting fact.',                                             params:[] },
      { method:'GET', path:'/api/v1/fun/trivia',         label:'Trivia Question',   desc:'Random multiple-choice trivia question.',                              params:[{name:'category',required:false,desc:'OpenTDB category ID (default: 9 = General)'}] },
      { method:'GET', path:'/api/v1/fun/riddle',         label:'Riddle',            desc:'Random riddle with its answer.',                                       params:[] },
      { method:'GET', path:'/api/v1/fun/wouldyourather', label:'Would You Rather',  desc:'Random "would you rather" question with two options.',                 params:[] },
      { method:'GET', path:'/api/v1/fun/coin',           label:'Coin Flip',         desc:'Flip a coin — heads or tails.',                                        params:[] },
      { method:'GET', path:'/api/v1/fun/dice',           label:'Dice Roll',         desc:'Roll N dice with any number of sides.',                               params:[{name:'sides',required:false,desc:'Sides per die (default: 6)'},{name:'count',required:false,desc:'Number of dice (default: 1, max: 10)'}] },
      { method:'GET', path:'/api/v1/fun/8ball',          label:'Magic 8 Ball',      desc:'Ask a yes/no question, get a mystical answer.',                        params:[{name:'q',required:false,desc:'Your question (optional)'}] },
    ],
  },
  {
    category: 'Search & Info',
    icon: '🔍',
    endpoints: [
      { method:'GET', path:'/api/v1/search/wikipedia', label:'Wikipedia Search', desc:'Get a Wikipedia article summary and thumbnail by search term.',          params:[{name:'q',required:true,desc:'Search term'}] },
      { method:'GET', path:'/api/v1/info/country',     label:'Country Info',     desc:'Detailed country data: capital, population, currencies, flag and more.', params:[{name:'name',required:true,desc:'Country name e.g. Nigeria'}] },
      { method:'GET', path:'/api/v1/info/currency',    label:'Exchange Rates',   desc:'Live exchange rates from any base currency to all others.',              params:[{name:'base',required:false,desc:'Base currency code e.g. USD, NGN (default: USD)'}] },
    ],
  },
  {
    category: 'Media & Image',
    icon: '🖼️',
    endpoints: [
      { method:'GET', path:'/api/v1/media/placeholder', label:'Placeholder Image', desc:'Generate a placeholder SVG image of any size, color, and label.',     params:[{name:'width',required:false,desc:'Width px (default: 400)'},{name:'height',required:false,desc:'Height px (default: 300)'},{name:'text',required:false,desc:'Label text'},{name:'bg',required:false,desc:'Background hex (no #)'},{name:'fg',required:false,desc:'Text hex (no #)'}] },
      { method:'GET', path:'/api/v1/media/avatar',      label:'Avatar Generator',  desc:'Generate a letter-based gradient avatar SVG for any name.',           params:[{name:'name',required:true,desc:'Name or username'},{name:'size',required:false,desc:'Size px (default: 150, max: 512)'}] },
    ],
  },
  {
    category: 'Network & Web',
    icon: '🌐',
    endpoints: [
      { method:'GET', path:'/api/v1/network/whois',   label:'WHOIS Lookup',      desc:'Get domain registration info — registrar, owner, expiry dates.',       params:[{name:'domain',required:true,desc:'Domain name e.g. google.com'}] },
      { method:'GET', path:'/api/v1/network/dns',     label:'DNS Lookup',        desc:'Resolve DNS records for a domain. Supports A, AAAA, MX, TXT, NS, CNAME, SOA, PTR.', params:[{name:'domain',required:true,desc:'Domain name'},{name:'type',required:false,desc:'Record type (default: A)'}] },
      { method:'GET', path:'/api/v1/network/ssl',     label:'SSL Certificate',   desc:'Check SSL certificate validity, expiry date and days remaining.',      params:[{name:'domain',required:true,desc:'Domain name e.g. google.com'}] },
      { method:'GET', path:'/api/v1/network/headers', label:'HTTP Headers',      desc:'Fetch all response headers from any URL.',                             params:[{name:'url',required:true,desc:'Full URL e.g. https://google.com'}] },
      { method:'GET', path:'/api/v1/network/status',  label:'Website Status',    desc:'Check if a website is up or down + response time.',                   params:[{name:'url',required:true,desc:'Full URL to check'}] },
      { method:'GET', path:'/api/v1/network/ping',    label:'Ping Host',         desc:'DNS-based reachability check for any hostname or IP.',                 params:[{name:'host',required:true,desc:'Hostname or IP address'}] },
    ],
  },
  {
    category: 'Host & IP',
    icon: '🖥️',
    endpoints: [
      { method:'GET', path:'/api/v1/host/ip',      label:'IP Info',           desc:'Full geo, ISP, ASN, proxy and hosting flags for any IPv4/IPv6 address.', params:[{name:'ip',required:true,desc:'IP address to look up'}] },
      { method:'GET', path:'/api/v1/host/myip',    label:'My IP',             desc:"Returns the caller's own IP address with geo info.",                    params:[] },
      { method:'GET', path:'/api/v1/host/lookup',  label:'Domain Lookup',     desc:'Full domain intelligence — A/MX/NS/TXT records + IP geo in one call.',  params:[{name:'domain',required:true,desc:'Domain name e.g. google.com'}] },
      { method:'GET', path:'/api/v1/host/reverse', label:'Reverse DNS',       desc:'Reverse DNS lookup — convert an IP address to its hostname.',           params:[{name:'ip',required:true,desc:'IP address'}] },
      { method:'GET', path:'/api/v1/host/ports',   label:'Port Scanner',      desc:'TCP port scan — check which common ports are open on a host.',          params:[{name:'host',required:true,desc:'Hostname or IP'},{name:'ports',required:false,desc:'Comma-separated ports (default: 15 common ports, max: 20)'}] },
      { method:'GET', path:'/api/v1/host/tech',    label:'Tech Stack Detect', desc:'Detect web server, framework, CMS, CDN and frontend tech from a URL.',  params:[{name:'url',required:true,desc:'Full URL e.g. https://example.com'}] },
    ],
  },
  {
    category: 'Detect & Analyse',
    icon: '🧠',
    endpoints: [
      { method:'POST', path:'/api/v1/detect/sentiment', label:'Sentiment Analysis', desc:'Score text as positive, negative or neutral with a confidence value.', params:[{name:'text',required:true,desc:'Text to analyse'}] },
      { method:'POST', path:'/api/v1/detect/language',  label:'Language Detection', desc:'Detect the language of any text and return ISO 639 language name.',    params:[{name:'text',required:true,desc:'Text to detect'}] },
      { method:'POST', path:'/api/v1/detect/profanity', label:'Profanity Filter',   desc:'Detect and optionally clean profanity from text.',                     params:[{name:'text',required:true,desc:'Text to check'},{name:'clean',required:false,desc:'true to return cleaned version (default: false)'}] },
      { method:'POST', path:'/api/v1/detect/spam',      label:'Spam Detector',      desc:'Score text for spam likelihood based on common patterns.',             params:[{name:'text',required:true,desc:'Text to check'}] },
    ],
  },
  {
    category: 'Image Tools',
    icon: '🎨',
    endpoints: [
      { method:'GET',  path:'/api/v1/image/generate',    label:'AI Image Generate', desc:'Generate an AI image from a text prompt using Pollinations.ai (free, no key).', params:[{name:'prompt',required:true,desc:'Image description'},{name:'model',required:false,desc:'flux|flux-realism|flux-anime|flux-3d|turbo (default: flux)'},{name:'width',required:false,desc:'Width px (default: 512, max: 1920)'},{name:'height',required:false,desc:'Height px (default: 512, max: 1920)'}] },
      { method:'GET',  path:'/api/v1/image/screenshot',  label:'Screenshot',        desc:'Capture a full-page screenshot of any URL (via Microlink, 100 free/day).',     params:[{name:'url',required:true,desc:'URL to screenshot'}] },
      { method:'GET',  path:'/api/v1/image/barcode',     label:'Barcode Generator', desc:'Generate a barcode PNG (Code128, QR, EAN-13, UPC and more).',                  params:[{name:'text',required:true,desc:'Text to encode'},{name:'type',required:false,desc:'code128|qrcode|ean13|upca (default: code128)'}] },
      { method:'GET',  path:'/api/v1/image/og',          label:'OG Image',          desc:'Generate an Open Graph social preview image.',                                 params:[{name:'title',required:true,desc:'Title text'},{name:'desc',required:false,desc:'Description text'},{name:'theme',required:false,desc:'dark|light (default: dark)'}] },
      { method:'POST', path:'/api/v1/image/resize',      label:'Image Resize',      desc:'Resize/crop any image by URL using images.weserv.nl (free, unlimited).',       params:[{name:'url',required:true,desc:'Image URL'},{name:'width',required:false,desc:'Target width'},{name:'height',required:false,desc:'Target height'}] },
    ],
  },
  {
    category: 'Data Conversion',
    icon: '📊',
    endpoints: [
      { method:'POST', path:'/api/v1/data/csv-to-json',  label:'CSV → JSON',     desc:'Parse a CSV string and return a JSON array of objects.',                params:[{name:'csv',required:true,desc:'CSV string'}] },
      { method:'POST', path:'/api/v1/data/json-to-csv',  label:'JSON → CSV',     desc:'Convert a JSON array of objects to CSV format.',                        params:[{name:'data',required:true,desc:'JSON array'}] },
      { method:'POST', path:'/api/v1/data/xml-to-json',  label:'XML → JSON',     desc:'Parse an XML string and return a JSON object.',                         params:[{name:'xml',required:true,desc:'XML string'}] },
      { method:'POST', path:'/api/v1/data/json-to-xml',  label:'JSON → XML',     desc:'Convert a JSON object to XML format.',                                  params:[{name:'data',required:true,desc:'JSON object'},{name:'root',required:false,desc:'Root element name (default: root)'}] },
      { method:'POST', path:'/api/v1/data/flatten',      label:'Flatten JSON',   desc:'Flatten a deeply nested JSON object to dot-notation keys.',             params:[{name:'data',required:true,desc:'Nested JSON object'}] },
      { method:'POST', path:'/api/v1/data/paginate',     label:'Paginate Array', desc:'Paginate any JSON array — pass the full array, get back one page.',     params:[{name:'data',required:true,desc:'JSON array'},{name:'page',required:false,desc:'Page number (default: 1)'},{name:'per_page',required:false,desc:'Items per page (default: 10)'}] },
    ],
  },
  {
    category: 'Weather',
    icon: '🌤️',
    endpoints: [
      { method:'GET', path:'/api/v1/weather/current',  label:'Current Weather', desc:'Live weather for any city — temp, humidity, wind, conditions.',         params:[{name:'city',required:true,desc:'City name e.g. Lagos'},{name:'units',required:false,desc:'metric|imperial|standard (default: metric)'}] },
      { method:'GET', path:'/api/v1/weather/forecast', label:'Weather Forecast',desc:'5-day weather forecast in 3-hour intervals for any city.',              params:[{name:'city',required:true,desc:'City name'},{name:'days',required:false,desc:'Days ahead (default: 5, max: 5)'},{name:'units',required:false,desc:'metric|imperial|standard (default: metric)'}] },
    ],
  },
  {
    category: 'Notify',
    icon: '🔔',
    endpoints: [
      { method:'POST', path:'/api/v1/notify/email',   label:'Send Email',   desc:'Send an HTML or plain-text email via your configured SMTP.',               params:[{name:'to',required:true,desc:'Recipient email'},{name:'subject',required:true,desc:'Email subject'},{name:'body',required:true,desc:'HTML or plain text body'}] },
      { method:'POST', path:'/api/v1/notify/webhook', label:'Send Webhook', desc:'Fire a POST request to any webhook URL with a custom JSON payload.',       params:[{name:'url',required:true,desc:'Webhook URL'},{name:'payload',required:true,desc:'JSON object to send'}] },
    ],
  },
  {
    category: 'Spotify',
    icon: '🎵',
    endpoints: [
      { method:'GET', path:'/api/v1/spotify/search', label:'Search Spotify', desc:'Search Spotify for tracks, artists or albums. Returns preview URLs.',     params:[{name:'q',required:true,desc:'Search query'},{name:'type',required:false,desc:'track|artist|album (default: track)'},{name:'limit',required:false,desc:'Results (default: 10, max: 50)'}] },
      { method:'GET', path:'/api/v1/spotify/track',  label:'Track Details',  desc:'Get full track info including 30-second preview MP3 URL.',               params:[{name:'id',required:true,desc:'Spotify track ID'}] },
      { method:'GET', path:'/api/v1/spotify/artist', label:'Artist Details', desc:'Get artist info — genres, popularity, follower count and images.',        params:[{name:'id',required:true,desc:'Spotify artist ID'}] },
      { method:'GET', path:'/api/v1/spotify/album',  label:'Album Details',  desc:'Get album info including full track listing with preview URLs.',          params:[{name:'id',required:true,desc:'Spotify album ID'}] },
    ],
  },
  {
    category: 'Downloads',
    icon: '📥',
    endpoints: [
      { method:'GET', path:'/api/v1/download/tiktok',    label:'TikTok Download',    desc:'Download TikTok videos without watermark. Returns HD, SD and audio links.', params:[{name:'url',required:true,desc:'TikTok video URL'}] },
      { method:'GET', path:'/api/v1/download/instagram', label:'Instagram Download', desc:'Download Instagram videos or images. Returns direct media links.',          params:[{name:'url',required:true,desc:'Instagram post URL'}] },
      { method:'GET', path:'/api/v1/download/twitter',   label:'Twitter/X Download', desc:'Download Twitter/X videos. Returns HD and SD MP4 links.',                  params:[{name:'url',required:true,desc:'Twitter or X.com post URL'}] },
      { method:'GET', path:'/api/v1/download/facebook',  label:'Facebook Download',  desc:'Download Facebook videos. Returns HD and SD MP4 links.',                   params:[{name:'url',required:true,desc:'Facebook video URL'}] },
      { method:'GET', path:'/api/v1/download/youtube',   label:'YouTube Download',   desc:'Get YouTube video download/stream link + metadata via cobalt.tools.',      params:[{name:'url',required:true,desc:'YouTube video URL or youtu.be link'}] },
    ],
  },
  {
    category: 'Meta',
    icon: '📡',
    endpoints: [
      { method:'GET', path:'/api/v1/meta/health',    label:'Health Check',     desc:'Returns server status. No API key required. Great for uptime monitors.', params:[] },
      { method:'GET', path:'/api/v1/meta/ping',      label:'Ping',             desc:'Simple ping — returns pong with server timestamp.',                      params:[] },
      { method:'GET', path:'/api/v1/meta/endpoints', label:'Endpoints Catalog',desc:'Returns a full machine-readable list of all available endpoints.',       params:[] },
    ],
  },
  {
    category: 'Crypto & Blockchain',
    icon: '💎',
    endpoints: [
      { method:'GET', path:'/api/v1/crypto/price',   label:'Coin Price',        desc:'Get live price of any coin in any currency (USD, NGN, EUR etc).',       params:[{name:'coin',required:false,desc:'CoinGecko coin ID e.g. bitcoin, ethereum (default: bitcoin)'},{name:'currency',required:false,desc:'Comma-separated currencies e.g. usd,ngn (default: usd,ngn)'}] },
      { method:'GET', path:'/api/v1/crypto/top',     label:'Top Coins',         desc:'Top coins ranked by market cap with 24h change.',                       params:[{name:'limit',required:false,desc:'Number of coins (default: 10, max: 50)'},{name:'currency',required:false,desc:'Currency (default: usd)'}] },
      { method:'GET', path:'/api/v1/crypto/history', label:'Price History',     desc:'Historical price chart data for any coin over N days.',                 params:[{name:'coin',required:false,desc:'Coin ID (default: bitcoin)'},{name:'days',required:false,desc:'Days of history (default: 7, max: 365)'},{name:'currency',required:false,desc:'Currency (default: usd)'}] },
      { method:'GET', path:'/api/v1/crypto/convert', label:'Crypto Convert',    desc:'Convert any amount from one crypto or fiat to another.',                params:[{name:'amount',required:false,desc:'Amount (default: 1)'},{name:'from',required:false,desc:'Coin ID e.g. bitcoin (default: bitcoin)'},{name:'to',required:false,desc:'Target currency e.g. ngn, eth (default: usd)'}] },
      { method:'GET', path:'/api/v1/crypto/gas',     label:'Ethereum Gas',      desc:'Current Ethereum gas fees — slow, standard and fast in Gwei.',          params:[] },
      { method:'GET', path:'/api/v1/crypto/search',  label:'Search Coins',      desc:'Search CoinGecko for a coin by name or symbol.',                        params:[{name:'q',required:true,desc:'Search term e.g. solana, bnb'}] },
    ],
  },
  {
    category: 'URL Tools',
    icon: '🔗',
    endpoints: [
      { method:'POST', path:'/api/v1/url/shorten', label:'Shorten URL',  desc:'Shorten any URL using TinyURL (free, no key needed).',                     params:[{name:'url',required:true,desc:'Full URL to shorten'}] },
      { method:'GET',  path:'/api/v1/url/expand',  label:'Expand URL',   desc:'Expand a shortened URL to its final destination.',                         params:[{name:'url',required:true,desc:'Short URL to expand'}] },
      { method:'POST', path:'/api/v1/url/parse',   label:'Parse URL',    desc:'Break a URL into all its components — protocol, host, path, params, hash.', params:[{name:'url',required:true,desc:'URL to parse'}] },
      { method:'GET',  path:'/api/v1/url/safe',    label:'Safety Check', desc:'Heuristic safety check — detects phishing patterns, suspicious domains.',  params:[{name:'url',required:true,desc:'URL to check'}] },
    ],
  },
  {
    category: 'News',
    icon: '📰',
    endpoints: [
      { method:'GET', path:'/api/v1/news/top',     label:'Top Headlines', desc:'Latest top headlines by category and country. Needs GNEWS_API_KEY.',     params:[{name:'category',required:false,desc:'general|world|nation|business|technology|entertainment|sports|science|health (default: general)'},{name:'country',required:false,desc:'Country code e.g. ng, us, gb (default: ng)'},{name:'lang',required:false,desc:'Language code e.g. en (default: en)'},{name:'limit',required:false,desc:'Results (default: 10, max: 10 on free tier)'}] },
      { method:'GET', path:'/api/v1/news/search',  label:'Search News',   desc:'Search news articles by keyword. Needs GNEWS_API_KEY.',                  params:[{name:'q',required:true,desc:'Search query'},{name:'lang',required:false,desc:'Language code (default: en)'},{name:'limit',required:false,desc:'Results (default: 10)'}] },
      { method:'GET', path:'/api/v1/news/sources', label:'Sources Info',  desc:'List all supported categories, countries and languages.',                 params:[] },
    ],
  },
  {
    category: 'Temp Email',
    icon: '📬',
    endpoints: [
      { method:'GET', path:'/api/v1/tempemail/generate',         label:'Generate Email',  desc:'Get a fresh temporary email address. No sign-up needed.',         params:[{name:'domain',required:false,desc:'Preferred domain e.g. 1secmail.com (use /domains to list options)'}] },
      { method:'GET', path:'/api/v1/tempemail/inbox',            label:'Read Inbox',      desc:'Check inbox for a temp email address.',                           params:[{name:'email',required:true,desc:'The temp email address'}] },
      { method:'GET', path:'/api/v1/tempemail/message',          label:'Read Message',    desc:'Read the full content of one email message.',                     params:[{name:'email',required:true,desc:'The temp email address'},{name:'id',required:true,desc:'Message ID from inbox'}] },
      { method:'GET', path:'/api/v1/tempemail/domains',          label:'List Domains',    desc:'List all available @domains for temp email generation.',           params:[] },
    ],
  },
  {
    category: 'Colour Tools',
    icon: '🎨',
    endpoints: [
      { method:'GET',  path:'/api/v1/color/convert', label:'Convert Color',  desc:'Convert any color between HEX, RGB, HSL and CMYK formats.',             params:[{name:'value',required:true,desc:'Color value e.g. %23ff5733 (URL-encode the #)'},{name:'from',required:false,desc:'hex|rgb|hsl (auto-detected if omitted)'}] },
      { method:'GET',  path:'/api/v1/color/name',    label:'Color Name',     desc:'Get the nearest CSS color name for any hex code.',                      params:[{name:'hex',required:true,desc:'Hex color e.g. ff5733 (without #)'}] },
      { method:'GET',  path:'/api/v1/color/contrast',label:'Contrast Ratio', desc:'WCAG contrast ratio between foreground and background colors.',         params:[{name:'fg',required:true,desc:'Foreground hex (without #)'},{name:'bg',required:true,desc:'Background hex (without #)'}] },
      { method:'GET',  path:'/api/v1/color/random',  label:'Random Color',   desc:'Generate random color(s) with all format values.',                      params:[{name:'count',required:false,desc:'How many colors (default: 1, max: 20)'}] },
      { method:'POST', path:'/api/v1/color/mix',     label:'Mix Colors',     desc:'Mix two or more hex colors with optional weights.',                     params:[{name:'colors',required:true,desc:'JSON array of hex colors e.g. ["#ff0000","#0000ff"]'},{name:'weights',required:false,desc:'JSON array of mix weights e.g. [0.7,0.3] (defaults to equal)'}] },
    ],
  },
  {
    category: 'Code Utilities',
    icon: '💻',
    endpoints: [
      { method:'POST', path:'/api/v1/code/minify',   label:'Minify Code',    desc:'Minify JSON, HTML, CSS or JavaScript. Returns size saved.',             params:[{name:'code',required:true,desc:'Source code string'},{name:'type',required:false,desc:'json|html|css|js (default: json)'}] },
      { method:'POST', path:'/api/v1/code/format',   label:'Format/Beautify',desc:'Prettify JSON or HTML with configurable indentation.',                  params:[{name:'code',required:true,desc:'Source code string'},{name:'type',required:false,desc:'json|html (default: json)'},{name:'indent',required:false,desc:'Spaces per indent (default: 2)'}] },
      { method:'POST', path:'/api/v1/code/count',    label:'Count Lines',    desc:'Count total, code, comment and blank lines. Detects language.',         params:[{name:'code',required:true,desc:'Source code string'}] },
      { method:'POST', path:'/api/v1/code/escape',   label:'Escape',         desc:'Escape code for HTML, URL, Base64 or Unicode.',                        params:[{name:'code',required:true,desc:'String to escape'},{name:'type',required:false,desc:'html|url|base64|unicode (default: html)'}] },
      { method:'POST', path:'/api/v1/code/unescape', label:'Unescape',       desc:'Reverse HTML entities, URL encoding, Base64 or Unicode escapes.',      params:[{name:'code',required:true,desc:'Escaped string'},{name:'type',required:false,desc:'html|url|base64|unicode (default: html)'}] },
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
