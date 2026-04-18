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
